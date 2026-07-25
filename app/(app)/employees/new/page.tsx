'use client';

import { Suspense, useEffect, useState, Children } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, Profile, Role } from '@/lib/supabase';
import { callManageEmployee } from '@/lib/manage-employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreatableSelect } from '@/components/creatable-select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  Wallet,
  Home,
  Loader2,
  Plus,
  Trash2,
  GraduationCap,
  Users,
  ShieldCheck,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];
const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'probation', label: 'Probation' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
const ADMIN_ROLES: Role[] = ['hr_admin', 'super_admin'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkExperience {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  grade: string;
}

interface Dependent {
  name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
}

interface FormState {
  employee_id: string;
  first_name: string;
  last_name: string;
  nick_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  marital_status: string;
  nationality: string;
  home_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  job_title: string;
  department: string;
  hire_date: string;
  employment_type: string;
  employment_status: string;
  role: Role;
  manager_id: string;
  bank_name: string;
  bank_account_number: string;
  password: string;
}

const emptyForm: FormState = {
  employee_id: '', first_name: '', last_name: '', nick_name: '',
  email: '', phone: '', gender: '', date_of_birth: '', marital_status: '',
  nationality: '', home_address: '', emergency_contact_name: '',
  emergency_contact_phone: '', job_title: '', department: '', hire_date: '',
  employment_type: 'full_time', employment_status: 'active',
  role: 'employee', manager_id: '', bank_name: '', bank_account_number: '',
  password: '',
};

const emptyExp: WorkExperience = { company: '', job_title: '', start_date: '', end_date: '', description: '' };
const emptyEdu: Education = { institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', grade: '' };
const emptyDep: Dependent = { name: '', relationship: '', date_of_birth: '', gender: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddEmployeePage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    }>
      <AddEmployeeForm />
    </Suspense>
  );
}

function AddEmployeeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  const { profile } = useAuth();
  const isAdmin = profile && ADMIN_ROLES.includes(profile.role as Role);

  const [managers, setManagers] = useState<Profile[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Dynamic lists
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);

  // Dialog states
  const [expDialog, setExpDialog] = useState<{ open: boolean; data: WorkExperience; index: number | null }>({ open: false, data: emptyExp, index: null });
  const [eduDialog, setEduDialog] = useState<{ open: boolean; data: Education; index: number | null }>({ open: false, data: emptyEdu, index: null });
  const [depDialog, setDepDialog] = useState<{ open: boolean; data: Dependent; index: number | null }>({ open: false, data: emptyDep, index: null });

  useEffect(() => {
    getSupabase()
      .from('profiles')
      .select('id,first_name,last_name,role')
      .in('role', ['manager', 'hr_admin', 'super_admin'])
      .eq('is_active', true)
      .then(({ data }) => setManagers((data as Profile[]) ?? []));
  }, []);

  useEffect(() => {
    if (!editId) return;
    setLoadingEmployee(true);
    getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error('Employee not found');
          router.push('/employees');
          return;
        }
        setForm({
          employee_id: data.employee_id ?? '',
          first_name: data.first_name,
          last_name: data.last_name,
          nick_name: data.nick_name ?? '',
          email: data.email,
          phone: data.phone ?? '',
          gender: data.gender ?? '',
          date_of_birth: data.date_of_birth ?? '',
          marital_status: data.marital_status ?? '',
          nationality: data.nationality ?? '',
          home_address: data.home_address ?? '',
          emergency_contact_name: data.emergency_contact_name ?? '',
          emergency_contact_phone: data.emergency_contact_phone ?? '',
          job_title: data.job_title ?? '',
          department: data.department ?? '',
          hire_date: data.hire_date ?? '',
          employment_type: data.employment_type ?? 'full_time',
          employment_status: data.employment_status ?? 'active',
          role: (data.role as Role) ?? 'employee',
          manager_id: data.manager_id ?? '',
          bank_name: data.bank_name ?? '',
          bank_account_number: data.bank_account_number ?? '',
          password: '',
        });
        setExperiences((data.work_experience as unknown as WorkExperience[]) ?? []);
        setEducations((data.education_details as unknown as Education[]) ?? []);
        setDependents((data.dependents as unknown as Dependent[]) ?? []);
        setLoadingEmployee(false);
      }, () => {
        setLoadingEmployee(false);
      });
  }, [editId, router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Experience helpers
  function saveExp() {
    const d = expDialog.data;
    if (!d.company || !d.job_title) { toast.error('Company and job title are required'); return; }
    setExperiences((prev) => {
      const next = [...prev];
      if (expDialog.index !== null) next[expDialog.index] = d;
      else next.push(d);
      return next;
    });
    setExpDialog({ open: false, data: emptyExp, index: null });
  }

  // ── Education helpers
  function saveEdu() {
    const d = eduDialog.data;
    if (!d.institution || !d.degree) { toast.error('Institution and degree are required'); return; }
    setEducations((prev) => {
      const next = [...prev];
      if (eduDialog.index !== null) next[eduDialog.index] = d;
      else next.push(d);
      return next;
    });
    setEduDialog({ open: false, data: emptyEdu, index: null });
  }

  // ── Dependent helpers
  function saveDep() {
    const d = depDialog.data;
    if (!d.name || !d.relationship) { toast.error('Name and relationship are required'); return; }
    setDependents((prev) => {
      const next = [...prev];
      if (depDialog.index !== null) next[depDialog.index] = d;
      else next.push(d);
      return next;
    });
    setDepDialog({ open: false, data: emptyDep, index: null });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('First name, last name and email are required');
      return;
    }
    if (!isEditMode && isAdmin && !form.password) {
      toast.error('Please set a temporary password');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const updates: Record<string, unknown> = {
          id: editId,
          first_name: form.first_name,
          last_name: form.last_name,
          nick_name: form.nick_name || null,
          email: form.email,
          role: form.role,
          employee_id: form.employee_id || null,
          phone: form.phone || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          marital_status: form.marital_status || null,
          nationality: form.nationality || null,
          home_address: form.home_address || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          job_title: form.job_title || null,
          department: form.department || null,
          hire_date: form.hire_date || null,
          employment_type: form.employment_type || null,
          employment_status: form.employment_status || null,
          manager_id: form.manager_id || null,
          bank_name: form.bank_name || null,
          bank_account_number: form.bank_account_number || null,
          work_experience: experiences,
          education_details: educations,
          dependents,
        };
        if (isAdmin && form.password) {
          updates.password = form.password;
        }
        await callManageEmployee('update', updates);
        toast.success('Employee updated successfully');
      } else {
        await callManageEmployee('create', {
          email: form.email,
          password: form.password || undefined,
          first_name: form.first_name,
          last_name: form.last_name,
          nick_name: form.nick_name || null,
          role: form.role,
          employee_id: form.employee_id || null,
          phone: form.phone || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          marital_status: form.marital_status || null,
          nationality: form.nationality || null,
          home_address: form.home_address || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          job_title: form.job_title || null,
          department: form.department || null,
          hire_date: form.hire_date || null,
          employment_type: form.employment_type || null,
          employment_status: form.employment_status || null,
          manager_id: form.manager_id || null,
          bank_name: form.bank_name || null,
          bank_account_number: form.bank_account_number || null,
          work_experience: experiences,
          education_details: educations,
          dependents,
        });
        toast.success('Employee created successfully');
      }
      router.push('/employees');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  if (loadingEmployee) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/employees')} className="rounded-lg px-2 hover:bg-secondary shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[#051536] truncate">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">
            {isEditMode ? 'Update the employee\'s information below' : 'Fill in the employee&apos;s information below to create their account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Basic Information ─────────────────────────────────── */}
        <SectionCard icon={User} title="Basic Information">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Employee ID" value={form.employee_id} onChange={(v) => update('employee_id', v)} placeholder="VCGL/04-001" />
            <Field label="First Name" required value={form.first_name} onChange={(v) => update('first_name', v)} placeholder="John" />
            <Field label="Last Name" required value={form.last_name} onChange={(v) => update('last_name', v)} placeholder="Doe" />
            <Field label="Nick Name" value={form.nick_name} onChange={(v) => update('nick_name', v)} placeholder="Johnny" />
            <Field label="Email Address" required type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="john@vcgl.com" />
            <Field label="Phone Number" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+234 800 000 0000" />
            <SelectField label="Gender" value={form.gender} onChange={(v) => update('gender', v)} options={GENDERS} placeholder="Select gender" />
            <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => update('date_of_birth', v)} />
            <SelectField label="Marital Status" value={form.marital_status} onChange={(v) => update('marital_status', v)} options={MARITAL_STATUSES} placeholder="Select status" />
            <Field label="Nationality" value={form.nationality} onChange={(v) => update('nationality', v)} placeholder="Nigerian" />
          </div>
        </SectionCard>

        {/* ── Address & Emergency ───────────────────────────────── */}
        <SectionCard icon={Home} title="Address & Emergency Contact">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Home Address</Label>
              <Textarea
                value={form.home_address}
                onChange={(e) => update('home_address', e.target.value)}
                placeholder="Enter full home address..."
                className="rounded-lg resize-none"
                rows={3}
              />
            </div>
            <Field label="Emergency Contact Name" value={form.emergency_contact_name} onChange={(v) => update('emergency_contact_name', v)} placeholder="Next of kin name" />
            <Field label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={(v) => update('emergency_contact_phone', v)} placeholder="+234 800 000 0000" />
          </div>
        </SectionCard>

        {/* ── Work Information ──────────────────────────────────── */}
        <SectionCard icon={Briefcase} title="Work Information">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Job Title" value={form.job_title} onChange={(v) => update('job_title', v)} placeholder="Software Engineer" />
            <div className="space-y-2">
              <Label>Department</Label>
              <CreatableSelect
                value={form.department}
                onChange={(v) => update('department', v)}
                table="departments"
                placeholder="Select or create department..."
              />
            </div>
            <Field label="Hire Date" type="date" value={form.hire_date} onChange={(v) => update('hire_date', v)} />
            <SelectField
              label="Employment Type"
              value={form.employment_type}
              onChange={(v) => update('employment_type', v)}
              options={EMPLOYMENT_TYPES.map((t) => t.value)}
              placeholder="Select type"
              displayMap={Object.fromEntries(EMPLOYMENT_TYPES.map((t) => [t.value, t.label]))}
            />
            <SelectField
              label="Employment Status"
              value={form.employment_status}
              onChange={(v) => update('employment_status', v)}
              options={EMPLOYMENT_STATUSES.map((s) => s.value)}
              placeholder="Select status"
              displayMap={Object.fromEntries(EMPLOYMENT_STATUSES.map((s) => [s.value, s.label]))}
            />
            <SelectField
              label="Role"
              value={form.role}
              onChange={(v) => update('role', v as Role)}
              options={['employee', 'manager', 'hr_admin', 'super_admin']}
              placeholder="Select role"
              displayMap={{ employee: 'Employee', manager: 'Manager', hr_admin: 'HR Admin', super_admin: 'Super Admin' }}
            />
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={form.manager_id || '__none__'} onValueChange={(v) => update('manager_id', v === '__none__' ? '' : v)}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="No manager assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No manager</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* ── Bank & Payroll ────────────────────────────────────── */}
        <SectionCard icon={Wallet} title="Bank & Payroll Information">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Bank Name" value={form.bank_name} onChange={(v) => update('bank_name', v)} placeholder="First Bank of Nigeria" />
            <Field label="Bank Account Number" value={form.bank_account_number} onChange={(v) => update('bank_account_number', v)} placeholder="0123456789" />
          </div>
        </SectionCard>

        {/* ── Work Experience ───────────────────────────────────── */}
        <ListSection
          icon={Briefcase}
          title="Work Experience"
          description="Add previous roles and relevant experience."
          emptyLabel="No work experience added."
          onAdd={() => setExpDialog({ open: true, data: emptyExp, index: null })}
          addLabel="Add experience"
        >
          {experiences.length > 0 && (
            <div className="space-y-3">
              {experiences.map((exp, i) => (
                <div key={i} className="flex items-start justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#051536]">{exp.job_title}</p>
                    <p className="text-xs text-muted-foreground">{exp.company}</p>
                    {(exp.start_date || exp.end_date) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exp.start_date} — {exp.end_date || 'Present'}
                      </p>
                    )}
                    {exp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exp.description}</p>}
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpDialog({ open: true, data: exp, index: i })}>
                      <span className="sr-only">Edit</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setExperiences((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ListSection>

        {/* ── Education Details ─────────────────────────────────── */}
        <ListSection
          icon={GraduationCap}
          title="Education Details"
          description="Add qualifications and completed studies."
          emptyLabel="No education details added."
          onAdd={() => setEduDialog({ open: true, data: emptyEdu, index: null })}
          addLabel="Add education"
        >
          {educations.length > 0 && (
            <div className="space-y-3">
              {educations.map((edu, i) => (
                <div key={i} className="flex items-start justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#051536]">{edu.degree}{edu.field_of_study ? ` — ${edu.field_of_study}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{edu.institution}</p>
                    {(edu.start_date || edu.end_date) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{edu.start_date} — {edu.end_date || 'Present'}</p>
                    )}
                    {edu.grade && <p className="text-xs text-muted-foreground mt-0.5">Grade: {edu.grade}</p>}
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEduDialog({ open: true, data: edu, index: i })}>
                      <span className="sr-only">Edit</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setEducations((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ListSection>

        {/* ── Dependent Details ─────────────────────────────────── */}
        <ListSection
          icon={Users}
          title="Dependent Details"
          description="Add family members or other dependents."
          emptyLabel="No dependents added."
          onAdd={() => setDepDialog({ open: true, data: emptyDep, index: null })}
          addLabel="Add dependent"
        >
          {dependents.length > 0 && (
            <div className="space-y-3">
              {dependents.map((dep, i) => (
                <div key={i} className="flex items-start justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#051536]">{dep.name}</p>
                    <p className="text-xs text-muted-foreground">{dep.relationship}{dep.gender ? ` · ${dep.gender}` : ''}</p>
                    {dep.date_of_birth && <p className="text-xs text-muted-foreground mt-0.5">DOB: {dep.date_of_birth}</p>}
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDepDialog({ open: true, data: dep, index: i })}>
                      <span className="sr-only">Edit</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDependents((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ListSection>

        {/* ── Account Setup (admin only) ────────────────────────── */}
        {isAdmin && (
          <SectionCard icon={ShieldCheck} title="Account Setup">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field
                label={isEditMode ? 'New Password (leave blank to keep current)' : 'Temporary Password'}
                required={!isEditMode}
                type="password"
                value={form.password}
                onChange={(v) => update('password', v)}
                placeholder={isEditMode ? 'Enter new password' : 'Set a password for the employee'}
              />
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground">
                  {isEditMode
                    ? 'Leave blank to keep the current password. The employee can change it from their settings.'
                    : 'The employee will use this password to sign in for the first time. They can change it later from their settings.'}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end pb-6">
          <Button type="button" variant="outline" onClick={() => router.push('/employees')} className="rounded-lg px-6">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-lg bg-[#032364] px-6 hover:bg-[#032364]/90">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? 'Updating...' : 'Creating...'}</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />{isEditMode ? 'Update Employee' : 'Create Employee'}</>
            )}
          </Button>
        </div>
      </form>

      {/* ── Work Experience Dialog ────────────────────────────────── */}
      <Dialog open={expDialog.open} onOpenChange={(o) => !o && setExpDialog({ open: false, data: emptyExp, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{expDialog.index !== null ? 'Edit' : 'Add'} Work Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Company Name" required value={expDialog.data.company} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, company: v } }))} placeholder="Vethan Concepts Group" />
            <Field label="Job Title" required value={expDialog.data.job_title} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, job_title: v } }))} placeholder="Software Engineer" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" type="date" value={expDialog.data.start_date} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, start_date: v } }))} />
              <Field label="End Date" type="date" value={expDialog.data.end_date} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, end_date: v } }))} />
            </div>
            <div>
              <Label className="mb-2 block">Description</Label>
              <Textarea
                value={expDialog.data.description}
                onChange={(e) => setExpDialog((s) => ({ ...s, data: { ...s.data, description: e.target.value } }))}
                placeholder="Key responsibilities and achievements..."
                className="rounded-lg resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialog({ open: false, data: emptyExp, index: null })}>Cancel</Button>
            <Button onClick={saveExp} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Education Dialog ──────────────────────────────────────── */}
      <Dialog open={eduDialog.open} onOpenChange={(o) => !o && setEduDialog({ open: false, data: emptyEdu, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{eduDialog.index !== null ? 'Edit' : 'Add'} Education</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Institution" required value={eduDialog.data.institution} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, institution: v } }))} placeholder="University of Lagos" />
            <Field label="Degree / Qualification" required value={eduDialog.data.degree} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, degree: v } }))} placeholder="B.Sc Computer Science" />
            <Field label="Field of Study" value={eduDialog.data.field_of_study} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, field_of_study: v } }))} placeholder="Computer Science" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" type="date" value={eduDialog.data.start_date} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, start_date: v } }))} />
              <Field label="End Date" type="date" value={eduDialog.data.end_date} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, end_date: v } }))} />
            </div>
            <Field label="Grade / Result" value={eduDialog.data.grade} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, grade: v } }))} placeholder="First Class / 4.0 GPA" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEduDialog({ open: false, data: emptyEdu, index: null })}>Cancel</Button>
            <Button onClick={saveEdu} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dependent Dialog ──────────────────────────────────────── */}
      <Dialog open={depDialog.open} onOpenChange={(o) => !o && setDepDialog({ open: false, data: emptyDep, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{depDialog.index !== null ? 'Edit' : 'Add'} Dependent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Full Name" required value={depDialog.data.name} onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, name: v } }))} placeholder="Jane Doe" />
            <SelectField
              label="Relationship"
              value={depDialog.data.relationship}
              onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, relationship: v } }))}
              options={RELATIONSHIPS}
              placeholder="Select relationship"
            />
            <Field label="Date of Birth" type="date" value={depDialog.data.date_of_birth} onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, date_of_birth: v } }))} />
            <SelectField
              label="Gender"
              value={depDialog.data.gender}
              onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, gender: v } }))}
              options={GENDERS}
              placeholder="Select gender"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepDialog({ open: false, data: emptyDep, index: null })}>Cancel</Button>
            <Button onClick={saveDep} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border-0 bg-white vcgl-shadow">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
            <Icon className="h-4 w-4 text-[#032364]" />
          </div>
          <h2 className="text-sm font-semibold text-[#051536]">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ListSection({
  icon: Icon, title, description, emptyLabel, onAdd, addLabel, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  emptyLabel: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  const childArray = Children.toArray(children);
  const hasContent = childArray.length > 0;
  return (
    <Card className="rounded-xl border-0 bg-white vcgl-shadow">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10 shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-[#032364]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#051536]">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="rounded-lg shrink-0 ml-4 text-xs font-medium"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {addLabel}
          </Button>
        </div>

        {hasContent ? children : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] py-8">
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, type = 'text', required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        className="h-10 rounded-lg border-[#0000004c]"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder, displayMap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  displayMap?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-10 rounded-lg">
          <SelectValue placeholder={placeholder ?? 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{displayMap?.[opt] ?? opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
