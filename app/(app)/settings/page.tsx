'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, LeaveType, LeaveBalance, Profile } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User, Plus, Pencil, Trash2, Clock } from 'lucide-react';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    nick_name: '',
    phone: '',
    job_title: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([]);
  const [ltDialog, setLtDialog] = useState(false);
  const [editingLt, setEditingLt] = useState<LeaveType | null>(null);
  const [ltForm, setLtForm] = useState({ name: '', description: '', days_allowed: 0, color: '#0e3a94' });
  const [savingLt, setSavingLt] = useState(false);
  const [savingBalances, setSavingBalances] = useState(false);

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        nick_name: profile.nick_name ?? '',
        phone: profile.phone ?? '',
        job_title: profile.job_title ?? '',
      });
    }
  }, [profile]);

  async function loadLeaveTypes() {
    const { data } = await supabase.from('leave_types').select('*').order('name');
    setLeaveTypes(data ?? []);
  }

  useEffect(() => {
    loadLeaveTypes();
    if (isHr) {
      loadEmployees();
    }
  }, [profile]);

  async function loadEmployees() {
    const { data } = await supabase.from('profiles').select('*').eq('is_active', true).order('first_name');
    setEmployees(data ?? []);
    if (data && data.length > 0) {
      setSelectedEmployeeId((prev) => prev || data[0].id);
    }
  }

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeBalances(selectedEmployeeId, selectedYear);
    }
  }, [selectedEmployeeId, selectedYear]);

  async function loadEmployeeBalances(employeeId: string, year: number) {
    const { data } = await supabase
      .from('leave_balances')
      .select('*, leave_types(*)')
      .eq('employee_id', employeeId)
      .eq('year', year);

    setEmployeeBalances(data ?? []);
  }

  const findBalance = (leaveTypeId: string) => {
    const existing = employeeBalances.find((bal) => bal.leave_type_id === leaveTypeId);
    if (existing) return existing;
    return {
      id: '',
      employee_id: selectedEmployeeId,
      leave_type_id: leaveTypeId,
      total_days: 0,
      used_days: 0,
      pending_days: 0,
      leave_types: leaveTypes.find((t) => t.id === leaveTypeId),
    } as LeaveBalance;
  };

  function updateBalanceField(leaveTypeId: string, field: 'total_days' | 'used_days' | 'pending_days', value: number) {
    setEmployeeBalances((prev) => {
      const existing = prev.find((bal) => bal.leave_type_id === leaveTypeId);
      if (existing) {
        return prev.map((bal) =>
          bal.leave_type_id === leaveTypeId ? { ...bal, [field]: value } : bal,
        );
      }
      return [
        ...prev,
        {
          id: '',
          employee_id: selectedEmployeeId,
          leave_type_id: leaveTypeId,
          year: selectedYear,
          total_days: field === 'total_days' ? value : 0,
          used_days: field === 'used_days' ? value : 0,
          pending_days: field === 'pending_days' ? value : 0,
          leave_types: leaveTypes.find((t) => t.id === leaveTypeId),
        } as LeaveBalance,
      ];
    });
  }

  async function handleSaveBalances() {
    if (!selectedEmployeeId) return;
    setSavingBalances(true);
    try {
      for (const bal of employeeBalances) {
        const payload = {
          employee_id: selectedEmployeeId,
          leave_type_id: bal.leave_type_id,
          year: selectedYear,
          total_days: bal.total_days,
          used_days: bal.used_days,
          pending_days: bal.pending_days,
        };
        if (bal.id) {
          const { error } = await supabase.from('leave_balances').update(payload).eq('id', bal.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('leave_balances').insert(payload);
          if (error) throw error;
        }
      }
      toast.success('Leave balances updated');
      await loadEmployeeBalances(selectedEmployeeId, selectedYear);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save leave balances');
    } finally {
      setSavingBalances(false);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          nick_name: profileForm.nick_name || null,
          phone: profileForm.phone || null,
          job_title: profileForm.job_title || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  function openAddLt() {
    setEditingLt(null);
    setLtForm({ name: '', description: '', days_allowed: 0, color: '#0e3a94' });
    setLtDialog(true);
  }

  function openEditLt(lt: LeaveType) {
    setEditingLt(lt);
    setLtForm({ name: lt.name, description: lt.description ?? '', days_allowed: lt.days_allowed, color: lt.color });
    setLtDialog(true);
  }

  async function handleSaveLt() {
    if (!profile) return;
    setSavingLt(true);
    try {
      if (editingLt) {
        const { error } = await supabase
          .from('leave_types')
          .update({
            name: ltForm.name,
            description: ltForm.description || null,
            days_allowed: ltForm.days_allowed,
            color: ltForm.color,
          })
          .eq('id', editingLt.id);
        if (error) throw error;
        await logAction(profile.id, 'update', 'leave_type', editingLt.id, { name: ltForm.name });
        toast.success('Leave type updated');
      } else {
        const { error } = await supabase.from('leave_types').insert({
          name: ltForm.name,
          description: ltForm.description || null,
          days_allowed: ltForm.days_allowed,
          color: ltForm.color,
        });
        if (error) throw error;
        await logAction(profile.id, 'create', 'leave_type', undefined, { name: ltForm.name });
        toast.success('Leave type created');
      }
      setLtDialog(false);
      loadLeaveTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save leave type');
    } finally {
      setSavingLt(false);
    }
  }

  async function handleDeleteLt(lt: LeaveType) {
    if (!confirm(`Delete ${lt.name}? This affects all leave balances.`)) return;
    try {
      const { error } = await supabase.from('leave_types').delete().eq('id', lt.id);
      if (error) throw error;
      toast.success('Leave type deleted');
      loadLeaveTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and system preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-white rounded-lg border border-border/50">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          {isHr && <TabsTrigger value="leave-types">Leave Types</TabsTrigger>}
          {isHr && <TabsTrigger value="leave-balances">Leave Customization</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <User className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Nick Name</Label>
                  <Input value={profileForm.nick_name} onChange={(e) => setProfileForm({ ...profileForm, nick_name: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={profileForm.job_title} onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })} className="rounded-lg" />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isHr && (
          <TabsContent value="leave-types">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                      <Clock className="h-5 w-5 text-[#032364]" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-[#051536]">Leave Types</CardTitle>
                  </div>
                  <Button onClick={openAddLt} size="sm" className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaveTypes.map((lt) => (
                    <div key={lt.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: lt.color }} />
                        <div>
                          <p className="text-sm font-medium">{lt.name}</p>
                          <p className="text-xs text-muted-foreground">{lt.days_allowed} days/year {lt.description ? `• ${lt.description}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditLt(lt)} className="rounded-lg">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteLt(lt)} className="rounded-lg text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isHr && (
          <TabsContent value="leave-balances">
            <Card className="rounded-xl border-0 bg-white vcgl-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                      <Clock className="h-5 w-5 text-[#032364]" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-[#051536]">Leave Customization</CardTitle>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="space-y-2">
                      <Label>Staff Member</Label>
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="w-[260px] rounded-lg">
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                        <SelectTrigger className="w-[120px] rounded-lg">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active staff available.</p>
                ) : (
                  <div className="space-y-4">
                    {leaveTypes.map((type) => {
                      const bal = findBalance(type.id);
                      return (
                        <div key={type.id} className="rounded-lg border border-border/50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold">{type.name}</p>
                              <p className="text-xs text-muted-foreground">{type.description ?? 'No description'}</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-[#032364]/10 px-3 py-1 text-xs text-[#032364]">
                              {type.days_allowed} days/year
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
                            <div className="space-y-2">
                              <Label>Total Days</Label>
                              <Input
                                type="number"
                                value={bal.total_days}
                                onChange={(e) => updateBalanceField(type.id, 'total_days', Number(e.target.value))}
                                className="rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Used Days</Label>
                              <Input
                                type="number"
                                value={bal.used_days}
                                onChange={(e) => updateBalanceField(type.id, 'used_days', Number(e.target.value))}
                                className="rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Pending Days</Label>
                              <Input
                                type="number"
                                value={bal.pending_days}
                                onChange={(e) => updateBalanceField(type.id, 'pending_days', Number(e.target.value))}
                                className="rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-end">
                      <Button onClick={handleSaveBalances} disabled={savingBalances || !selectedEmployeeId} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
                        {savingBalances ? 'Saving...' : 'Save Balances'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Leave Type Dialog */}
      <Dialog open={ltDialog} onOpenChange={setLtDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLt ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
            <DialogDescription>Configure leave category and rules</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={ltForm.name} onChange={(e) => setLtForm({ ...ltForm, name: e.target.value })} className="rounded-lg" placeholder="e.g. Annual Leave" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={ltForm.description} onChange={(e) => setLtForm({ ...ltForm, description: e.target.value })} className="rounded-lg" placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Days Allowed Per Year</Label>
                <Input type="number" value={ltForm.days_allowed} onChange={(e) => setLtForm({ ...ltForm, days_allowed: Number(e.target.value) })} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={ltForm.color} onChange={(e) => setLtForm({ ...ltForm, color: e.target.value })} className="h-10 w-16 rounded-lg p-1" />
                  <Input value={ltForm.color} onChange={(e) => setLtForm({ ...ltForm, color: e.target.value })} className="rounded-lg" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLtDialog(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleSaveLt} disabled={savingLt} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
              {savingLt ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
