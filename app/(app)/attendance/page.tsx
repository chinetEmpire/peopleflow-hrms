'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDuration, attendanceStatusFromDuration, getAutoCheckoutTime, shouldAutoCheckout } from '@/lib/utils';
import { supabase, AttendanceRecord, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendancePage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teamRecords, setTeamRecords] = useState<{ record: AttendanceRecord; employee: Profile }[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState('00:00:00');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const isManager = profile?.role === 'manager';
  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  };

  async function reconcileAttendanceRecord(record: AttendanceRecord | null) {
    if (!record || !record.check_in || record.check_out) return record;
    if (!shouldAutoCheckout(record.check_in, record.check_out)) return record;

    const checkoutAt = getAutoCheckoutTime(record.check_in);
    const { data } = await supabase
      .from('attendance_records')
      .update({ check_out: checkoutAt, status: 'absent' })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();

    return data ?? record;
  }

  async function loadMyRecords() {
    if (!profile) return;
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', profile.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    setRecords(data ?? []);

    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    const normalized = await reconcileAttendanceRecord(todayData);
    setTodayRecord(normalized);
  }

  async function loadTeamRecords() {
    if (!profile || (!isManager && !isHr)) return;
    const today = new Date().toISOString().split('T')[0];

    const { data: team } = await supabase
      .from('profiles')
      .select('*')
      .eq(isManager ? 'manager_id' : 'is_active', isManager ? profile.id : true)
      .eq('is_active', true);

    if (!team || team.length === 0) {
      setTeamRecords([]);
      return;
    }

    const { data: atts } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today)
      .in('employee_id', team.map((t) => t.id));

    const combined = await Promise.all(
      (team ?? []).map(async (emp) => {
        const record = (atts ?? []).find((a) => a.employee_id === emp.id) ?? null;
        const reconciled = await reconcileAttendanceRecord(record);
        return {
          record: reconciled,
          employee: emp,
        };
      }),
    );

    setTeamRecords(combined.filter((x) => x.record !== null) as { record: AttendanceRecord; employee: Profile }[]);
  }

  useEffect(() => {
    loadMyRecords();
  }, [profile, month, year]);

  useEffect(() => {
    if (isManager || isHr) loadTeamRecords();
  }, [profile]);

  useEffect(() => {
    if (!todayRecord?.check_in) {
      setLiveDuration('00:00:00');
      return;
    }

    const updateDuration = () => {
      if (!todayRecord.check_in) return;
      const startTime = new Date(todayRecord.check_in).getTime();
      const endTime = todayRecord.check_out ? new Date(todayRecord.check_out).getTime() : Date.now();
      setLiveDuration(formatDuration(endTime - startTime));
    };

    updateDuration();

    if (todayRecord.check_out) return;

    const timer = window.setInterval(updateDuration, 1000);
    return () => window.clearInterval(timer);
  }, [todayRecord]);

  async function handleCheckIn() {
    if (!profile) return;
    if (todayRecord?.check_in && !todayRecord?.check_out) {
      toast.error('You have already checked in today. Please check out first.');
      return;
    }
    setClockLoading(true);
    const location = await getCurrentLocation();
    if (!location) {
      window.alert('Unable to capture your location. Please allow location access and try again.');
      setClockLoading(false);
      return;
    }

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('attendance_records')
      .upsert({
        employee_id: profile.id,
        date: today,
        check_in: now,
        check_in_lat: location.lat,
        check_in_lng: location.lng,
        status: 'present',
      })
      .select('*')
      .maybeSingle();
    setTodayRecord(data);
    setClockLoading(false);
    loadMyRecords();
  }

  async function handleCheckOut() {
    if (!profile || !todayRecord || !todayRecord.check_in) return;
    setClockLoading(true);
    const location = await getCurrentLocation();
    if (!location) {
      window.alert('Unable to capture your location. Please allow location access and try again.');
      setClockLoading(false);
      return;
    }

    const now = new Date().toISOString();
    const status = attendanceStatusFromDuration(todayRecord.check_in, now);

    const { data } = await supabase
      .from('attendance_records')
      .update({
        check_out: now,
        check_out_lat: location.lat,
        check_out_lng: location.lng,
        status,
      })
      .eq('id', todayRecord.id)
      .select('*')
      .maybeSingle();
    setTodayRecord(data);
    setClockLoading(false);
    loadMyRecords();
  }

  if (!profile) return null;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function statusBadge(status: string) {
    switch (status) {
      case 'present': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" />Present</Badge>;
      case 'late': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertCircle className="mr-1 h-3 w-3" />Late</Badge>;
      case 'absent': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="mr-1 h-3 w-3" />Absent</Badge>;
      case 'half_day': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Clock className="mr-1 h-3 w-3" />Half Day</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your daily check-in and check-out</p>
      </div>

      {/* Clock Card */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#032364]/10 shrink-0">
                <Clock className="h-7 w-7 text-[#032364]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#051536]">Today&apos;s Attendance</h3>
                <p className="text-sm text-muted-foreground">
                  {todayRecord?.check_in
                    ? `Checked in at ${new Date(todayRecord.check_in).toLocaleTimeString()}`
                    : 'You have not checked in today'}
                  {todayRecord?.check_out
                    ? ` • Checked out at ${new Date(todayRecord.check_out).toLocaleTimeString()}`
                    : todayRecord?.check_in
                    ? ' • Still working'
                    : ''}
                </p>
                {todayRecord?.check_in_lat && todayRecord?.check_in_lng ? (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Check-in location: {todayRecord.check_in_lat.toFixed(4)}, {todayRecord.check_in_lng.toFixed(4)}
                  </p>
                ) : null}
                {todayRecord?.check_out_lat && todayRecord?.check_out_lng ? (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Check-out location: {todayRecord.check_out_lat.toFixed(4)}, {todayRecord.check_out_lng.toFixed(4)}
                  </p>
                ) : null}
                {todayRecord && <div className="mt-1">{statusBadge(todayRecord.status)}</div>}
              </div>
            </div>
            {todayRecord?.check_in && (
              <div className="flex flex-col items-center gap-1 sm:items-end">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {todayRecord?.check_out ? 'Total Time Worked' : 'Time Worked Today'}
                </p>
                <p className="text-5xl font-mono font-bold text-[#032364] tabular-nums">{liveDuration}</p>
              </div>
            )}
            <div className="flex w-full gap-3 sm:w-auto">
              <Button
                onClick={handleCheckIn}
                disabled={clockLoading || !!todayRecord?.check_in}
                className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={clockLoading || !todayRecord?.check_in || !!todayRecord?.check_out}
                variant="outline"
                className="rounded-lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Attendance (Manager/HR) */}
      {(isManager || isHr) && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Team Attendance Today</CardTitle>
          </CardHeader>
          <CardContent>
            {teamRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team members checked in today.</p>
            ) : (
              <div className="space-y-2">
                {teamRecords.map(({ record, employee }) => (
                  <div key={record.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#032364] text-xs font-semibold text-white">
                        {employee.first_name[0]}{employee.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          In: {record.check_in ? new Date(record.check_in).toLocaleTimeString() : '—'}
                          {record.check_out && ` • Out: ${new Date(record.check_out).toLocaleTimeString()}`}
                          {record.check_in && (
                            <> • {formatDuration(
                              new Date(record.check_out ?? Date.now()).getTime() - new Date(record.check_in).getTime(),
                            )}</>
                          )}
                        </p>
                        {record.check_in_lat && record.check_in_lng ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {record.check_in_lat.toFixed(4)}, {record.check_in_lng.toFixed(4)}
                          </p>
                        ) : null}
                        {record.check_out_lat && record.check_out_lng ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {record.check_out_lat.toFixed(4)}, {record.check_out_lng.toFixed(4)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {statusBadge(record.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Attendance History */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold text-[#051536]">My Attendance History</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
              >
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
              >
                {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No attendance records for this period.</p>
          ) : (
            <div className="space-y-2">
              {records.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-medium">
                      {new Date(rec.date).getDate()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">
                        In: {rec.check_in ? new Date(rec.check_in).toLocaleTimeString() : '—'}
                        {rec.check_out && ` • Out: ${new Date(rec.check_out).toLocaleTimeString()}`}
                        {rec.check_in && (
                          <> • {formatDuration(
                            new Date(rec.check_out ?? Date.now()).getTime() - new Date(rec.check_in).getTime(),
                          )}</>
                        )}
                      </p>
                    </div>
                  </div>
                  {statusBadge(rec.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
