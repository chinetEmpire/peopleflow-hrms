'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDuration, attendanceStatusFromDuration, getAutoCheckoutTime, shouldAutoCheckout } from '@/lib/utils';
import { getSupabase, AttendanceRecord, LeaveRequest, LeaveBalance, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, CalendarCheck, CalendarOff, Users, LogIn, LogOut, TrendingUp, CheckCircle2, XCircle, Clock3, Cake, MapPin } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0, onLeave: 0 });
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [birthdays, setBirthdays] = useState<Profile[]>([]);
  const [clockLoading, setClockLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState('00:00:00');

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';
  const isManager = profile?.role === 'manager';

  async function reconcileAttendanceRecord(record: AttendanceRecord | null) {
    if (!record || !record.check_in || record.check_out) return record;
    if (!shouldAutoCheckout(record.check_in, record.check_out)) return record;

    const checkoutAt = getAutoCheckoutTime(record.check_in);
    const { data } = await getSupabase()
      .from('attendance_records')
      .update({ check_out: checkoutAt, status: 'absent' })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();

    return data ?? record;
  }

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

  async function loadData() {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];

    // Today's attendance
    const { data: att } = await getSupabase()
      .from('attendance_records')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(await reconcileAttendanceRecord(att));

    // My leave requests
    const { data: leaves, error: leavesError } = await getSupabase()
      .from('leave_requests')
      .select('id, employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, approved_by, approved_at, rejection_reason, created_at, leave_types(name, color)')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (leavesError) {
      console.error('Failed to load dashboard leave requests', leavesError);
      setMyLeaves([]);
    } else {
      setMyLeaves((leaves ?? []) as unknown as LeaveRequest[]);
    }

    // My leave balances
    const { data: bals } = await getSupabase()
      .from('leave_balances')
      .select('*, leave_types(*)')
      .eq('employee_id', profile.id)
      .eq('year', new Date().getFullYear());
    setBalances(bals ?? []);

    if (isHr) {
      const { count } = await getSupabase().from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: present } = await getSupabase().from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).not('check_in', 'is', null);
      const { count: pending } = await getSupabase().from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setStats({
        totalEmployees: count ?? 0,
        presentToday: present ?? 0,
        pendingLeaves: pending ?? 0,
        onLeave: 0,
      });
    }

    const month = new Date().getMonth() + 1;
    const { data: birthdayRows } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .not('date_of_birth', 'is', null);
    setBirthdays(
      (birthdayRows ?? [])
        .filter((emp) => {
          const dob = emp.date_of_birth;
          if (!dob) return false;
          const birthMonth = new Date(dob).getMonth() + 1;
          return birthMonth === month;
        })
        .sort((a, b) => {
          if (!a.date_of_birth || !b.date_of_birth) return 0;
          return new Date(a.date_of_birth).getDate() - new Date(b.date_of_birth).getDate();
        }),
    );

    if (isManager) {
      const { data: team } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('manager_id', profile.id)
        .eq('is_active', true);
      setTeamMembers(team ?? []);
    }
  }

  useEffect(() => {
    loadData();
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

    const { data } = await getSupabase()
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
    const { data } = await getSupabase()
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
  }

  if (!profile) return null;

  const fullName = `${profile.first_name} ${profile.last_name}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {fullName}</p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#032364]/10">
                  <Clock className="h-7 w-7 text-[#032364]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#051536]">Attendance</h3>
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
                      Check-in: {todayRecord.check_in_lat.toFixed(4)}, {todayRecord.check_in_lng.toFixed(4)}
                    </p>
                  ) : null}
                  {todayRecord?.check_out_lat && todayRecord?.check_out_lng ? (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Check-out: {todayRecord.check_out_lat.toFixed(4)}, {todayRecord.check_out_lng.toFixed(4)}
                    </p>
                  ) : null}
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
              <div className="flex gap-3">
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

      {/* Stats Grid */}
      {isHr && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/employees" className="block">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-semibold text-[#051536]">{stats.totalEmployees}</p>
                  </div>
                  <Users className="h-6 w-6 text-[#032364]" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/attendance" className="block">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Present Today</p>
                    <p className="text-2xl font-semibold text-[#051536]">{stats.presentToday}</p>
                  </div>
                  <CalendarCheck className="h-6 w-6 text-[#059669]" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/time-off" className="block">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Leaves</p>
                    <p className="text-2xl font-semibold text-[#051536]">{stats.pendingLeaves}</p>
                  </div>
                  <Clock3 className="h-6 w-6 text-[#d97706]" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/time-off" className="block">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">On Leave Today</p>
                    <p className="text-2xl font-semibold text-[#051536]">{stats.onLeave}</p>
                  </div>
                  <CalendarOff className="h-6 w-6 text-[#7c3aed]" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Birthday of the Month Card */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Birthday of the Month</CardTitle>
          </CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No employee birthdays this month.</p>
            ) : (
              <div className="space-y-3">
                {birthdays.map((employee) => {
                  const date = employee.date_of_birth ? new Date(employee.date_of_birth) : null;
                  return (
                    <div key={employee.id} className="flex items-center gap-3 rounded-2xl border border-border/50 p-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                        {employee.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={employee.avatar_url} alt={`${employee.first_name} ${employee.last_name}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#032364] text-sm font-semibold text-white">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#051536]">{employee.first_name} {employee.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.job_title ?? 'Employee'} • {date ? date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Leave Balances */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">My Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leave balances allocated yet.</p>
            ) : (
              <div className="space-y-3">
                {balances.map((bal) => {
                  const remaining = bal.total_days - bal.used_days - bal.pending_days;
                  const pct = bal.total_days > 0 ? ((bal.total_days - remaining) / bal.total_days) * 100 : 0;
                  return (
                    <div key={bal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{bal.leave_types?.name}</span>
                        <span className="text-sm text-muted-foreground">{remaining} / {bal.total_days} days</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: bal.leave_types?.color ?? '#032364' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Recent Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {myLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leave requests yet.</p>
            ) : (
              <div className="space-y-3">
                {myLeaves.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: (req.leave_types?.color ?? '#032364') + '20' }}
                      >
                        <Clock className="h-4 w-4" style={{ color: req.leave_types?.color ?? '#032364' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{req.leave_types?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manager: Team Members */}
      {isManager && teamMembers.length > 0 && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">My Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#032364] text-sm font-semibold text-white">
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-muted-foreground">{member.job_title ?? 'Employee'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: number; color: string }) {
  return (
    <Card className="rounded-xl border-0 bg-white vcgl-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-[#051536] mt-1">{value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: color + '15' }}>
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock3 className="mr-1 h-3 w-3" />Pending</Badge>;
}
