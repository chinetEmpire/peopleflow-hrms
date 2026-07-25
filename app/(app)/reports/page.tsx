'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, Profile, AttendanceRecord, LeaveRequest } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CalendarCheck, Clock3, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { present: number; late: number; absent: number }>>({});
  const [leaveStats, setLeaveStats] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; present: number; late: number }[]>([]);
  const [activeReport, setActiveReport] = useState<'daily' | 'weekly' | 'monthly' | 'leave'>('daily');
  const [exporting, setExporting] = useState(false);

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';
  const isManager = profile?.role === 'manager';

  const formatCsvValue = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const buildCsv = (headers: string[], rows: Array<string[]>) => {
    return [headers.map(formatCsvValue).join(','), ...rows.map((row) => row.map(formatCsvValue).join(','))].join('\r\n');
  };

  const buildXls = (headers: string[], rows: Array<string[]>) => {
    const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
    const bodyRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`)
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const attendanceDateRange = (range: 'daily' | 'weekly' | 'monthly') => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start: string;
    if (range === 'daily') {
      start = end;
    } else if (range === 'weekly') {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      start = startDate.toISOString().split('T')[0];
    } else {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      start = startDate.toISOString().split('T')[0];
    }
    return { start, end };
  };

  const exportAttendanceReport = async (range: 'daily' | 'weekly' | 'monthly', format: 'csv' | 'xls') => {
    if (!profile) return;
    setExporting(true);
    try {
      const teamIds = employees.map((emp) => emp.id);
      const { start, end } = attendanceDateRange(range);
      const { data: records, error } = await getSupabase()
        .from('attendance_records')
        .select('*')
        .in('employee_id', teamIds)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });
      if (error) throw error;

      const employeeMap = Object.fromEntries(employees.map((emp) => [emp.id, `${emp.first_name} ${emp.last_name}`]));
      const rows = (records ?? []).map((rec) => [
        employeeMap[rec.employee_id] ?? rec.employee_id,
        rec.date,
        rec.check_in ?? '',
        rec.check_out ?? '',
        rec.status,
        rec.check_in && rec.check_out ? String(Math.round((new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 1000 / 60)) : '',
        rec.check_in_lat != null && rec.check_in_lng != null ? `https://www.google.com/maps?q=${rec.check_in_lat},${rec.check_in_lng}` : '',
        rec.check_out_lat != null && rec.check_out_lng != null ? `https://www.google.com/maps?q=${rec.check_out_lat},${rec.check_out_lng}` : '',
      ]);
      const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Status', 'Duration (minutes)', 'Check-in Location', 'Check-out Location'];
      const content = format === 'csv' ? buildCsv(headers, rows) : buildXls(headers, rows);
      const ext = format === 'csv' ? 'csv' : 'xls';
      downloadFile(content, `attendance-${range}-report.${ext}`, format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel');
    } catch (err) {
      console.error('Export attendance report failed', err);
    } finally {
      setExporting(false);
    }
  };

  const exportLeaveReport = async (format: 'csv' | 'xls') => {
    if (!profile) return;
    setExporting(true);
    try {
      const teamIds = employees.map((emp) => emp.id);
      const { data: leaves, error } = await getSupabase()
        .from('leave_requests')
        .select('*, leave_types(*)')
        .in('employee_id', teamIds)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const employeeMap = Object.fromEntries(employees.map((emp) => [emp.id, `${emp.first_name} ${emp.last_name}`]));
      const rows = (leaves ?? []).map((req) => [
        employeeMap[req.employee_id] ?? req.employee_id,
        req.leave_types?.name ?? '',
        req.start_date,
        req.end_date,
        String(req.days_requested),
        req.status,
        req.reason ?? '',
        req.approved_at ?? '',
      ]);
      const headers = ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days Requested', 'Status', 'Reason', 'Approved At'];
      const content = format === 'csv' ? buildCsv(headers, rows) : buildXls(headers, rows);
      const ext = format === 'csv' ? 'csv' : 'xls';
      downloadFile(content, `leave-report.${ext}`, format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel');
    } catch (err) {
      console.error('Export leave report failed', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    async function loadReport() {
      if (!profile) return;

      let teamIds: string[] = [];
      if (isManager) {
        const { data: team } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('manager_id', profile.id)
          .eq('is_active', true);
        setEmployees(team ?? []);
        teamIds = (team ?? []).map((t) => t.id);
      } else if (isHr) {
        const { data: all } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .neq('id', profile.id);
        setEmployees(all ?? []);
        teamIds = (all ?? []).map((t) => t.id);
      }

      if (teamIds.length === 0) return;

      // This month attendance
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const { data: atts } = await getSupabase()
        .from('attendance_records')
        .select('*')
        .in('employee_id', teamIds)
        .gte('date', startDate)
        .lte('date', endDate);

      // Per-employee stats
      const stats: Record<string, { present: number; late: number; absent: number }> = {};
      (atts ?? []).forEach((a) => {
        if (!stats[a.employee_id]) stats[a.employee_id] = { present: 0, late: 0, absent: 0 };
        if (a.status === 'present') stats[a.employee_id].present++;
        else if (a.status === 'late') stats[a.employee_id].late++;
        else if (a.status === 'absent') stats[a.employee_id].absent++;
      });
      setAttendanceStats(stats);

      // Monthly trend (last 6 months)
      const months: { month: string; present: number; late: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: mAtts } = await getSupabase()
          .from('attendance_records')
          .select('*')
          .in('employee_id', teamIds)
          .gte('date', ms)
          .lte('date', me);
        const present = (mAtts ?? []).filter((a) => a.status === 'present').length;
        const late = (mAtts ?? []).filter((a) => a.status === 'late').length;
        months.push({ month: d.toLocaleDateString('en-US', { month: 'short' }), present, late });
      }
      setMonthlyData(months);

      // Leave stats
      const { data: leaves } = await getSupabase()
        .from('leave_requests')
        .select('*')
        .in('employee_id', teamIds);
      setLeaveStats({
        approved: (leaves ?? []).filter((l) => l.status === 'approved').length,
        pending: (leaves ?? []).filter((l) => l.status === 'pending').length,
        rejected: (leaves ?? []).filter((l) => l.status === 'rejected').length,
      });
    }

    loadReport();
  }, [profile]);

  if (!profile) return null;

  const maxMonthly = Math.max(...monthlyData.map((m) => Math.max(m.present, m.late)), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isManager ? 'Your team attendance and leave analytics' : 'Company-wide attendance and leave analytics'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Team Size" value={employees.length} color="#032364" />
        <StatCard icon={CalendarCheck} label="Present This Month" value={Object.values(attendanceStats).reduce((s, v) => s + v.present, 0)} color="#059669" />
        <StatCard icon={Clock3} label="Late This Month" value={Object.values(attendanceStats).reduce((s, v) => s + v.late, 0)} color="#d97706" />
        <StatCard icon={TrendingUp} label="Pending Leaves" value={leaveStats.pending} color="#7c3aed" />
      </div>

      {/* Monthly Trend Chart */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Attendance Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 sm:h-64 items-end justify-around gap-2 sm:gap-4 overflow-x-auto">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex flex-1 min-w-[40px] flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-4 sm:w-6 rounded-t bg-[#032364] transition-all"
                    style={{ height: `${(m.present / maxMonthly) * 100}%`, minHeight: m.present > 0 ? '4px' : '0' }}
                    title={`Present: ${m.present}`}
                  />
                  <div
                    className="w-4 sm:w-6 rounded-t bg-amber-400 transition-all"
                    style={{ height: `${(m.late / maxMonthly) * 100}%`, minHeight: m.late > 0 ? '4px' : '0' }}
                    title={`Late: ${m.late}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-[#032364]" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-amber-400" />
              <span>Late</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Employee Breakdown */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Per-Employee Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No team members.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const s = attendanceStats[emp.id] ?? { present: 0, late: 0, absent: 0 };
                const total = s.present + s.late + s.absent;
                const rate = total > 0 ? Math.round((s.present / total) * 100) : 0;
                return (
                  <div key={emp.id} className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#032364] text-xs font-semibold text-white overflow-hidden shrink-0">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={`${emp.first_name} ${emp.last_name}`} className="h-full w-full object-cover" />
                        ) : (
                          <span>{emp.first_name[0]}{emp.last_name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.job_title ?? 'Employee'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-12 sm:pl-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Present</p>
                        <p className="text-sm font-medium text-green-600">{s.present}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Late</p>
                        <p className="text-sm font-medium text-amber-600">{s.late}</p>
                      </div>
                      <Badge className={rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                        {rate}% rate
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Summary */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Leave Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center rounded-lg bg-green-50 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="mt-2 text-xl font-bold text-green-700">{leaveStats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-amber-50 p-4">
              <Clock3 className="h-8 w-8 text-amber-600" />
              <p className="mt-2 text-xl font-bold text-amber-700">{leaveStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-red-50 p-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <p className="mt-2 text-xl font-bold text-red-700">{leaveStats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as 'daily' | 'weekly' | 'monthly' | 'leave')}>
            <TabsList className="bg-white rounded-lg border border-border/50 flex overflow-x-auto">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4 p-0">
              <p className="text-sm text-muted-foreground mb-4">Export daily attendance records for your team.</p>
            </TabsContent>
            <TabsContent value="weekly" className="mt-4 p-0">
              <p className="text-sm text-muted-foreground mb-4">Export attendance records for the last 7 days.</p>
            </TabsContent>
            <TabsContent value="monthly" className="mt-4 p-0">
              <p className="text-sm text-muted-foreground mb-4">Export attendance records for the current month.</p>
            </TabsContent>
            <TabsContent value="leave" className="mt-4 p-0">
              <p className="text-sm text-muted-foreground mb-4">Export leave requests for your team.</p>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              onClick={() => {
                if (activeReport === 'leave') exportLeaveReport('csv');
                else exportAttendanceReport(activeReport, 'csv');
              }}
              disabled={exporting || employees.length === 0}
            >
              Export {activeReport === 'leave' ? 'Leave' : `${activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Attendance`} CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (activeReport === 'leave') exportLeaveReport('xls');
                else exportAttendanceReport(activeReport, 'xls');
              }}
              disabled={exporting || employees.length === 0}
            >
              Export {activeReport === 'leave' ? 'Leave' : `${activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Attendance`} XLS
            </Button>
          </div>
          {employees.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No team members found for export.</p>
          ) : null}
          {exporting ? <p className="mt-3 text-sm text-muted-foreground">Preparing export…</p> : null}
        </CardContent>
      </Card>
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
            <p className="text-xl font-bold text-[#051536] mt-1">{value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: color + '15' }}>
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
