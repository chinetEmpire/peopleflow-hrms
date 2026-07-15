'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';

type DepartmentRecord = {
  id: string;
  name: string;
  manager_id: string | null;
  created_at?: string;
  updated_at?: string;
};
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

export default function DepartmentsPage() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [form, setForm] = useState({ id: '', name: '', manager_id: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAuthorized = profile?.role === 'hr_admin' || profile?.role === 'super_admin';
  const isHr = profile?.role === 'hr_admin';

  useEffect(() => {
    if (!profile) return;
    if (!isAuthorized) return;

    loadDepartments();
    loadManagers();
  }, [profile]);

  async function loadDepartments() {
    const result = await supabase
      .from('departments')
      .select('id, name, manager_id, created_at, updated_at')
      .order('name', { ascending: true });
    const data = result.data as DepartmentRecord[] | null;
    const error = result.error;
    if (error) {
      console.error('loadDepartments failed', error);
      toast.error(`Unable to load departments: ${error.message}`);
      return;
    }
    setDepartments(data ?? []);
  }

  async function loadManagers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['manager', 'hr_admin', 'super_admin'])
      .eq('is_active', true)
      .order('first_name');
    if (error) {
      toast.error('Unable to load managers');
      return;
    }
    setManagers(data ?? []);
  }

  function openAdd() {
    setForm({ id: '', name: '', manager_id: '' });
    setDialogOpen(true);
  }

  function openEdit(dept: DepartmentRecord) {
    setForm({ id: dept.id, name: dept.name, manager_id: dept.manager_id ?? '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!profile) return;
    if (!form.name) {
      toast.error('Department name is required');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase
          .from('departments')
          .update({ name: form.name, manager_id: form.manager_id || null })
          .eq('id', form.id);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { data, error } = await supabase.from('departments').insert({ name: form.name, manager_id: form.manager_id || null }).select('id, name');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Department creation returned no data');
        toast.success('Department created');
      }
      setDialogOpen(false);
      loadDepartments();
    } catch (err) {
      console.error('handleSave failed', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this department?')) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete department');
      return;
    }
    toast.success('Department deleted');
    loadDepartments();
  }

  if (!profile || !isAuthorized) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#051536]">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">Create departments and assign managers.</p>
        </div>
        <Button onClick={openAdd} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
          <Plus className="mr-2 h-4 w-4" />
          New Department
        </Button>
      </div>

      <div className="grid gap-4">
        {departments.length === 0 ? (
          <Card className="rounded-xl border-0 bg-white vcgl-shadow p-6">
            <p className="text-sm text-muted-foreground">No departments yet. Add one to get started.</p>
          </Card>
        ) : (
          departments.map((dept) => (
            <Card key={dept.id} className="rounded-xl border-0 bg-white vcgl-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#051536]">{dept.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Manager: {dept.manager_id ? (managers.find((mgr) => mgr.id === dept.manager_id) ? `${managers.find((mgr) => mgr.id === dept.manager_id)?.first_name} ${managers.find((mgr) => mgr.id === dept.manager_id)?.last_name}` : 'Assigned') : 'Not assigned'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(dept)} className="rounded-lg">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(dept.id)} className="rounded-lg text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className={dialogOpen ? '' : 'hidden'}>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow p-6">
          <CardHeader className="pb-3">
            <CardTitle>{form.id ? 'Edit Department' : 'New Department'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={form.manager_id} onValueChange={(value) => setForm({ ...form, manager_id: value })}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No manager</SelectItem>
                  {managers.map((mgr) => (
                    <SelectItem key={mgr.id} value={mgr.id}>
                      {mgr.first_name} {mgr.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
