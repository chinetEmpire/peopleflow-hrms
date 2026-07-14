'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, AttendanceRecord, LeaveRequest, LeaveBalance, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, CalendarOff, Users, LogIn, LogOut, TrendingUp, CheckCircle2, XCircle, Clock3 } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0, onLeave: 0 });
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [clockLoading, setClockLoading] = useState(false);

  const isHr = profile?.role === 'hr_admin';
  const isManager = profile?.role === 'manager';
  const isSuperAdmin = profile?.role === 'super_admin';

  async function loadData() {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];

    // Today's attendance
    const { data: att } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(att);

    // My leave requests
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*, leave_types(*), profiles(*)')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setMyLeaves(leaves ?? []);

    // My leave balances
    const { data: bals } = await supabase
      .from('leave_balances')
      .select('*, leave_types(*)')
      .eq('employee_id', profile.id)
      .eq('year', new Date().getFullYear());
    setBalances(bals ?? []);

    if (isHr || isSuperAdmin) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).not('check_in', 'is', null);
      const { count: pending } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setStats({
        totalEmployees: count ?? 0,
        presentToday: present ?? 0,
        pendingLeaves: pending ?? 0,
        onLeave: 0,
      });
    }

    if (isManager) {
      const { data: team } = await supabase
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

  async function handleCheckIn() {
    if (!profile) return;
    setClockLoading(true);
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const status = hour >= 9 ? 'late' : 'present';

    const { data } = await supabase
      .from('attendance_records')
      .upsert({
        employee_id: profile.id,
        date: today,
        check_in: now,
        status,
      })
      .select('*')
      .maybeSingle();
    setTodayRecord(data);
    setClockLoading(false);
  }

  async function handleCheckOut() {
    if (!profile || !todayRecord) return;
    setClockLoading(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('attendance_records')
      .update({ check_out: now })
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
        <h1 className="text-2xl font-bold text-[#051536]">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {fullName}</p>
      </div>

      {/* Clock In/Out Card */}
      {!isSuperAdmin && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#032364]/10">
                  <Clock className="h-7 w-7 text-[#032364]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#051536]">Attendance</h3>
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
                </div>
              </div>
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
      )}

      {/* Stats Grid */}
      {(isHr || isSuperAdmin) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="#032364" />
          <StatCard icon={CalendarCheck} label="Present Today" value={stats.presentToday} color="#059669" />
          <StatCard icon={Clock3} label="Pending Leaves" value={stats.pendingLeaves} color="#d97706" />
          <StatCard icon={CalendarOff} label="On Leave Today" value={stats.onLeave} color="#7c3aed" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Leave Balances */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#051536]">My Leave Balances</CardTitle>
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
            <CardTitle className="text-base font-semibold text-[#051536]">Recent Leave Requests</CardTitle>
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
            <CardTitle className="text-base font-semibold text-[#051536]">My Team</CardTitle>
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
                    <p className="text-xs text-muted-foreground">{member.job_title ?? member.department ?? 'Employee'}</p>
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
