'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, LeaveRequest, LeaveType, LeaveBalance, Profile } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Clock, Plus, CheckCircle2, XCircle, Clock3, Calendar } from 'lucide-react';

export default function TimeOffPage() {
  const { profile } = useAuth();
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';

  async function loadData() {
    if (!profile || !profile.org_id) return;
    const orgId = profile.org_id;

    // Leave types
    const { data: types, error: typesError } = await getSupabase().from('leave_types').select('*').eq('org_id', orgId).eq('is_active', true);
    if (typesError) {
      console.error('Failed to load leave types', typesError);
      toast.error('Unable to load leave types');
      setLeaveTypes([]);
    } else {
      setLeaveTypes(types ?? []);
    }

    // My requests
    const { data: reqs, error: reqsError } = await getSupabase()
      .from('leave_requests')
      .select('id, employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, approved_by, approved_at, rejection_reason, created_at, leave_types(name, color)')
      .eq('employee_id', profile.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (reqsError) {
      console.error('Failed to load my leave requests', reqsError);
      toast.error('Unable to load your leave requests');
      setMyRequests([]);
    } else {
      setMyRequests((reqs ?? []) as unknown as LeaveRequest[]);
    }

    // My balances
    const { data: bals, error: balsError } = await getSupabase()
      .from('leave_balances')
      .select('*, leave_types(*)')
      .eq('employee_id', profile.id)
      .eq('org_id', orgId)
      .eq('year', new Date().getFullYear());
    if (balsError) {
      console.error('Failed to load leave balances', balsError);
      toast.error('Unable to load your leave balances');
      setBalances([]);
    } else {
      setBalances(bals ?? []);
    }

    // Pending approvals (HR)
    if (isHr) {
      const { data: pending, error: pendingError } = await getSupabase()
        .from('leave_requests')
        .select('*, leave_types(*), profiles!employee_id(id, first_name, last_name)')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Failed to load pending leave approvals', pendingError);
        toast.error('Unable to load pending leave requests');
        setPendingApprovals([]);
      } else {
        setPendingApprovals(pending ?? []);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [profile]);

  function calculateDays(start: string, end: string) {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }

  async function handleSubmit() {
    if (!profile) return;
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const days = calculateDays(form.start_date, form.end_date);

      const { data: insertedRequest, error: insertError } = await getSupabase().from('leave_requests').insert({
        employee_id: profile.id,
        org_id: profile.org_id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: days,
        reason: form.reason || null,
        status: 'pending',
      }).select('*, leave_types(*)').maybeSingle();

      if (insertError) throw insertError;

      // Update pending days in balance
      const bal = balances.find((b) => b.leave_type_id === form.leave_type_id);
      if (bal) {
        await getSupabase().from('leave_balances')
          .update({ pending_days: bal.pending_days + days })
          .eq('id', bal.id);
      }

      await logAction(profile.id, 'create', 'leave_request', undefined, { days, type: form.leave_type_id }, profile.org_id);
      toast.success('Leave request submitted');
      setDialogOpen(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      if (insertedRequest) {
        setMyRequests((prev) => [insertedRequest, ...prev]);
      }
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(req: LeaveRequest) {
    if (!profile) return;
    try {
      const { error } = await getSupabase()
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;

      // Update balance: move pending to used
      const { data: bal } = await getSupabase()
        .from('leave_balances')
        .select('*')
        .eq('employee_id', req.employee_id)
        .eq('leave_type_id', req.leave_type_id)
        .eq('year', new Date().getFullYear())
        .maybeSingle();

      if (bal) {
        await getSupabase().from('leave_balances')
          .update({
            pending_days: Math.max(0, bal.pending_days - req.days_requested),
            used_days: bal.used_days + req.days_requested,
          })
          .eq('id', bal.id);
      }

      await logAction(profile.id, 'approve', 'leave_request', req.id, undefined, profile.org_id);
      toast.success('Leave request approved');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    }
  }

  async function handleReject(req: LeaveRequest) {
    if (!profile) return;
    const reason = prompt('Reason for rejection?');
    if (!reason) return;

    try {
      const { error } = await getSupabase()
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', req.id);
      if (error) throw error;

      // Revert pending days
      const { data: bal } = await getSupabase()
        .from('leave_balances')
        .select('*')
        .eq('employee_id', req.employee_id)
        .eq('leave_type_id', req.leave_type_id)
        .eq('year', new Date().getFullYear())
        .maybeSingle();

      if (bal) {
        await getSupabase().from('leave_balances')
          .update({ pending_days: Math.max(0, bal.pending_days - req.days_requested) })
          .eq('id', bal.id);
      }

      await logAction(profile.id, 'reject', 'leave_request', req.id, { reason }, profile.org_id);
      toast.success('Leave request rejected');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    }
  }

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#051536]">Time Off</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your leave requests and balances</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.length === 0 ? (
          <Card className="col-span-full rounded-xl border-0 bg-white vcgl-shadow">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No leave balances allocated. Contact HR.
            </CardContent>
          </Card>
        ) : (
          balances.map((bal) => {
            const remaining = bal.total_days - bal.used_days - bal.pending_days;
            const pct = bal.total_days > 0 ? ((bal.total_days - remaining) / bal.total_days) * 100 : 0;
            return (
              <Card key={bal.id} className="rounded-xl border-0 bg-white vcgl-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: bal.leave_types?.color ?? '#032364' }} />
                      <span className="text-sm font-medium">{bal.leave_types?.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{bal.year}</span>
                  </div>
                  <p className="text-xl font-bold text-[#051536]">{remaining}</p>
                  <p className="text-xs text-muted-foreground">days remaining of {bal.total_days}</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: bal.leave_types?.color ?? '#032364' }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Used: {bal.used_days}</span>
                    <span>Pending: {bal.pending_days}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Tabs defaultValue={isHr ? 'approvals' : 'mine'}>
        {isHr && (
          <TabsList className="bg-white rounded-lg border border-border/50 flex overflow-x-auto">
            <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
            <TabsTrigger value="mine">My Requests</TabsTrigger>
          </TabsList>
        )}

        {isHr && (
          <TabsContent value="approvals">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#051536]">Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No pending leave requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.map((req) => (
                      <div key={req.id} className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: (req.leave_types?.color ?? '#032364') + '20' }}>
                            <Clock className="h-5 w-5" style={{ color: req.leave_types?.color ?? '#032364' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{req.profiles?.first_name} {req.profiles?.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.leave_types?.name} • {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()} • {req.days_requested} day(s)
                            </p>
                            {req.reason && <p className="text-xs text-muted-foreground mt-1">"{req.reason}"</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(req)} className="rounded-lg bg-green-600 hover:bg-green-600/90">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(req)} className="rounded-lg text-destructive">
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="mine">
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#051536]">My Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No leave requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: (req.leave_types?.color ?? '#032364') + '20' }}>
                          <Clock className="h-4 w-4" style={{ color: req.leave_types?.color ?? '#032364' }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.leave_types?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()} • {req.days_requested} day(s)
                          </p>
                          {req.rejection_reason && <p className="text-xs text-destructive mt-1">Rejected: {req.rejection_reason}</p>}
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a new leave application</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.days_allowed} days/year)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="rounded-lg" />
              </div>
            </div>

            {form.start_date && form.end_date && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{calculateDays(form.start_date, form.end_date)} day(s)</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Brief reason for leave..."
                className="rounded-lg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock3 className="mr-1 h-3 w-3" />Pending</Badge>;
}
