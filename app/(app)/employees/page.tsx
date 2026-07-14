'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Role } from '@/lib/supabase';
import { callManageEmployee } from '@/lib/manage-employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { UserPlus, Search, Pencil, Trash2, Users, Mail, Phone, Briefcase, Building, X } from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    nick_name: '',
    email: '',
    role: 'employee' as Role,
    department: '',
    job_title: '',
    phone: '',
    hire_date: '',
    manager_id: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setEmployees(data ?? []);
    const mgrs = (data ?? []).filter((e) => e.role === 'manager' || e.role === 'hr_admin');
    setManagers(mgrs);
    setLoading(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({
      employee_id: '',
      first_name: '',
      last_name: '',
      nick_name: '',
      email: '',
      role: 'employee',
      department: '',
      job_title: '',
      phone: '',
      hire_date: '',
      manager_id: '',
      password: '',
    });
    setDialogOpen(true);
  }

  function openEdit(emp: Profile) {
    setEditing(emp);
    setForm({
      employee_id: emp.employee_id ?? '',
      first_name: emp.first_name,
      last_name: emp.last_name,
      nick_name: emp.nick_name ?? '',
      email: emp.email,
      role: emp.role,
      department: emp.department ?? '',
      job_title: emp.job_title ?? '',
      phone: emp.phone ?? '',
      hire_date: emp.hire_date ?? '',
      manager_id: emp.manager_id ?? '',
      password: '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    try {
      if (editing) {
        await callManageEmployee('update', {
          id: editing.id,
          employee_id: form.employee_id || null,
          first_name: form.first_name,
          last_name: form.last_name,
          nick_name: form.nick_name || null,
          email: form.email,
          role: form.role,
          department: form.department || null,
          job_title: form.job_title || null,
          phone: form.phone || null,
          hire_date: form.hire_date || null,
          manager_id: form.manager_id || null,
          password: form.password || undefined,
        });
        toast.success('Employee updated successfully');
      } else {
        await callManageEmployee('create', {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          nick_name: form.nick_name || null,
          role: form.role,
          employee_id: form.employee_id || null,
          department: form.department || null,
          job_title: form.job_title || null,
          phone: form.phone || null,
          hire_date: form.hire_date || null,
          manager_id: form.manager_id || null,
        });
        toast.success('Employee added successfully');
      }

      setDialogOpen(false);
      loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Profile) {
    if (!profile) return;
    if (!confirm(`Delete ${emp.first_name} ${emp.last_name}? This cannot be undone.`)) return;

    try {
      await callManageEmployee('delete', { id: emp.id });
      toast.success('Employee deleted');
      loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete employee');
    }
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.employee_id ?? '').toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    );
  });

  function roleBadge(role: Role) {
    const colors: Record<Role, string> = {
      employee: 'bg-blue-100 text-blue-700',
      manager: 'bg-purple-100 text-purple-700',
      hr_admin: 'bg-amber-100 text-amber-700',
      super_admin: 'bg-red-100 text-red-700',
    };
    const labels: Record<Role, string> = {
      employee: 'Employee',
      manager: 'Manager',
      hr_admin: 'HR Admin',
      super_admin: 'Super Admin',
    };
    return <Badge className={`${colors[role]} hover:${colors[role]}`}>{labels[role]}</Badge>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#051536]">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all employee accounts</p>
        </div>
        <Button onClick={() => router.push('/employees/new')} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add new employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg pl-10"
        />
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No employees found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className="rounded-xl border-0 bg-white vcgl-shadow transition-all hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#032364] text-sm font-semibold text-white">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-[#051536]">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.employee_id ?? 'No ID'}</p>
                    </div>
                  </div>
                  {roleBadge(emp.role)}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    {emp.job_title ?? 'No title'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-3.5 w-3.5" />
                    {emp.department ?? 'No department'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {emp.phone}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(emp)} className="rounded-lg">
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(emp)} className="rounded-lg text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update employee information' : 'Create a new employee account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-[#051536]">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Employee ID" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} />
                <FormField label="First Name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
                <FormField label="Last Name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
                <FormField label="Nick Name" value={form.nick_name} onChange={(v) => setForm({ ...form, nick_name: v })} />
                <FormField label="Email Address" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required type="email" />
                <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
            </div>

            {/* Work Information */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-[#051536]">Work Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                <FormField label="Job Title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
                <FormField label="Hire Date" value={form.hire_date} onChange={(v) => setForm({ ...form, hire_date: v })} type="date" />

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr_admin">HR Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Select value={form.manager_id || '__none__'} onValueChange={(v) => setForm({ ...form, manager_id: v === '__none__' ? '' : v })}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="No manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No manager</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  label={editing ? 'New Password (optional)' : 'Password'}
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  type="password"
                  required={!editing}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-[#0000004c]"
      />
    </div>
  );
}
