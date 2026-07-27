'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, LeaveType, LeaveBalance, Profile, Role } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { getWorkSchedule, updateWorkSchedule, getAllCompensation, upsertCompensation, formatCurrency, getPayFrequencyLabel } from '@/lib/payroll';
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
import {
  User, Plus, Pencil, Trash2, Clock, Camera, Briefcase, Home, Wallet, GraduationCap, Users as UsersIcon, ShieldCheck, Loader2,
} from 'lucide-react';
import { CreatableSelect } from '@/components/creatable-select';
import { BrandingTab } from '@/components/branding-tab';

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

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

interface WorkExperience {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface EducationDetail {
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

const emptyExp: WorkExperience = { company: '', job_title: '', start_date: '', end_date: '', description: '' };
const emptyEdu: EducationDetail = { institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', grade: '' };
const emptyDep: Dependent = { name: '', relationship: '', date_of_birth: '', gender: '' };

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    nick_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    nationality: '',
    home_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    employee_id: '',
    email: '',
    job_title: '',
    department: '',
    hire_date: '',
    employment_type: '',
    employment_status: '',
    role: '' as Role,
    manager_id: '',
    bank_name: '',
    bank_account_number: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<EducationDetail[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [expDialog, setExpDialog] = useState<{ open: boolean; data: WorkExperience; index: number | null }>({ open: false, data: emptyExp, index: null });
  const [eduDialog, setEduDialog] = useState<{ open: boolean; data: EducationDetail; index: number | null }>({ open: false, data: emptyEdu, index: null });
  const [depDialog, setDepDialog] = useState<{ open: boolean; data: Dependent; index: number | null }>({ open: false, data: emptyDep, index: null });

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([]);
  const [ltDialog, setLtDialog] = useState(false);
  const [editingLt, setEditingLt] = useState<LeaveType | null>(null);
  const [ltForm, setLtForm] = useState({ name: '', description: '', days_allowed: 0, color: '#0e3a94' });
  const [savingLt, setSavingLt] = useState(false);
  const [savingBalances, setSavingBalances] = useState(false);

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';
  const canEditWorkInfo = isHr;

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        nick_name: profile.nick_name ?? '',
        phone: profile.phone ?? '',
        gender: profile.gender ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        marital_status: profile.marital_status ?? '',
        nationality: profile.nationality ?? '',
        home_address: profile.home_address ?? '',
        emergency_contact_name: profile.emergency_contact_name ?? '',
        emergency_contact_phone: profile.emergency_contact_phone ?? '',
        employee_id: profile.employee_id ?? '',
        email: profile.email,
        job_title: profile.job_title ?? '',
        department: profile.department ?? '',
        hire_date: profile.hire_date ?? '',
        employment_type: profile.employment_type ?? '',
        employment_status: profile.employment_status ?? '',
        role: profile.role,
        manager_id: profile.manager_id ?? '',
        bank_name: profile.bank_name ?? '',
        bank_account_number: profile.bank_account_number ?? '',
      });
      setAvatarPreview(profile.avatar_url ?? null);
      setExperiences((profile.work_experience as unknown as WorkExperience[]) ?? []);
      setEducations((profile.education_details as unknown as EducationDetail[]) ?? []);
      setDependents((profile.dependents as unknown as Dependent[]) ?? []);
    }
  }, [profile]);

  async function loadLeaveTypes() {
    if (!profile?.org_id) return;
    const { data } = await getSupabase().from('leave_types').select('*').eq('org_id', profile.org_id).order('name');
    setLeaveTypes(data ?? []);
  }

  useEffect(() => {
    loadLeaveTypes();
    loadManagers();
    if (isHr) {
      loadEmployees();
    }
  }, [profile]);

  async function loadEmployees() {
    if (!profile?.org_id) return;
    const { data } = await getSupabase().from('profiles').select('*').eq('org_id', profile.org_id).eq('is_active', true).order('first_name');
    setEmployees(data ?? []);
    if (data && data.length > 0) {
      setSelectedEmployeeId((prev) => prev || data[0].id);
    }
  }

  async function loadManagers() {
    if (!profile?.org_id) return;
    const { data } = await getSupabase()
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('org_id', profile.org_id)
      .in('role', ['manager', 'hr_admin', 'super_admin'])
      .eq('is_active', true);
    setManagers((data as Profile[]) ?? []);
  }

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeBalances(selectedEmployeeId, selectedYear);
    }
  }, [selectedEmployeeId, selectedYear]);

  async function loadEmployeeBalances(employeeId: string, year: number) {
    if (!profile?.org_id) return;
    const { data } = await getSupabase()
      .from('leave_balances')
      .select('*, leave_types(*)')
      .eq('employee_id', employeeId)
      .eq('org_id', profile.org_id)
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
          org_id: profile?.org_id,
          year: selectedYear,
          total_days: bal.total_days,
          used_days: bal.used_days,
          pending_days: bal.pending_days,
        };
        if (bal.id) {
          const { error } = await getSupabase().from('leave_balances').update(payload).eq('id', bal.id);
          if (error) throw error;
        } else {
          const { error } = await getSupabase().from('leave_balances').insert(payload);
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Profile picture must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(avatarFile);
        });
        avatarUrl = base64;
      }

      const { error } = await getSupabase()
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          nick_name: profileForm.nick_name || null,
          phone: profileForm.phone || null,
          gender: canEditWorkInfo ? (profileForm.gender || null) : profile.gender,
          date_of_birth: canEditWorkInfo ? (profileForm.date_of_birth || null) : profile.date_of_birth,
          marital_status: canEditWorkInfo ? (profileForm.marital_status || null) : profile.marital_status,
          nationality: canEditWorkInfo ? (profileForm.nationality || null) : profile.nationality,
          home_address: canEditWorkInfo ? (profileForm.home_address || null) : profile.home_address,
          emergency_contact_name: canEditWorkInfo ? (profileForm.emergency_contact_name || null) : profile.emergency_contact_name,
          emergency_contact_phone: canEditWorkInfo ? (profileForm.emergency_contact_phone || null) : profile.emergency_contact_phone,
          employee_id: isHr ? (profileForm.employee_id || null) : profile.employee_id,
          job_title: isHr ? (profileForm.job_title || null) : profile.job_title,
          department: isHr ? (profileForm.department || null) : profile.department,
          hire_date: isHr ? (profileForm.hire_date || null) : profile.hire_date,
          employment_type: isHr ? (profileForm.employment_type || null) : profile.employment_type,
          employment_status: isHr ? (profileForm.employment_status || null) : profile.employment_status,
          manager_id: isHr ? (profileForm.manager_id || null) : profile.manager_id,
          bank_name: isHr ? (profileForm.bank_name || null) : profile.bank_name,
          bank_account_number: isHr ? (profileForm.bank_account_number || null) : profile.bank_account_number,
          avatar_url: avatarUrl,
          work_experience: experiences,
          education_details: educations,
          dependents: dependents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setAvatarFile(null);
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
        const { error } = await getSupabase()
          .from('leave_types')
          .update({
            name: ltForm.name,
            description: ltForm.description || null,
            days_allowed: ltForm.days_allowed,
            color: ltForm.color,
          })
          .eq('id', editingLt.id);
        if (error) throw error;
        await logAction(profile.id, 'update', 'leave_type', editingLt.id, { name: ltForm.name }, profile.org_id);
        toast.success('Leave type updated');
      } else {
        const { error } = await getSupabase().from('leave_types').insert({
          name: ltForm.name,
          description: ltForm.description || null,
          days_allowed: ltForm.days_allowed,
          color: ltForm.color,
          org_id: profile?.org_id,
        });
        if (error) throw error;
        await logAction(profile.id, 'create', 'leave_type', undefined, { name: ltForm.name }, profile.org_id);
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
      const { error } = await getSupabase().from('leave_types').delete().eq('id', lt.id);
      if (error) throw error;
      toast.success('Leave type deleted');
      loadLeaveTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!profile) return null;

  const roleLabels: Record<Role, string> = {
    employee: 'Employee',
    manager: 'Manager',
    hr_admin: 'HR Admin',
    super_admin: 'Super Admin',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and system preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-white rounded-lg border border-border/50 flex overflow-x-auto">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          {isHr && <TabsTrigger value="branding">Branding</TabsTrigger>}
          {isHr && <TabsTrigger value="leave-types">Leave Types</TabsTrigger>}
          {isHr && <TabsTrigger value="leave-balances">Leave Customization</TabsTrigger>}
          {isHr && <TabsTrigger value="work-schedule">Work Schedule</TabsTrigger>}
          {isHr && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Picture */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <Camera className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Profile Picture</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#032364] text-2xl font-semibold text-white overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span>{profileForm.first_name[0]}{profileForm.last_name[0]}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border shadow-sm hover:bg-muted transition-colors"
                  >
                    <Camera className="h-4 w-4 text-[#032364]" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#051536]">Upload a photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg text-xs"
                    >
                      Choose File
                    </Button>
                    {avatarPreview && avatarPreview !== profile.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAvatarPreview(profile.avatar_url ?? null); setAvatarFile(null); }}
                        className="rounded-lg text-xs text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <User className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Basic Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileField label="First Name" value={profileForm.first_name} onChange={(v) => setProfileForm({ ...profileForm, first_name: v })} required />
                <ProfileField label="Last Name" value={profileForm.last_name} onChange={(v) => setProfileForm({ ...profileForm, last_name: v })} required />
                <ProfileField label="Nick Name" value={profileForm.nick_name} onChange={(v) => setProfileForm({ ...profileForm, nick_name: v })} />
                <ProfileField label="Email Address" value={profileForm.email} readOnly />
                <ProfileField label="Phone Number" value={profileForm.phone} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} />
                <ProfileSelect
                  label="Gender"
                  value={profileForm.gender}
                  onChange={(v) => setProfileForm({ ...profileForm, gender: v })}
                  options={GENDERS}
                  readOnly={!canEditWorkInfo}
                />
                <ProfileField label="Date of Birth" type="date" value={profileForm.date_of_birth} onChange={(v) => setProfileForm({ ...profileForm, date_of_birth: v })} readOnly={!canEditWorkInfo} />
                <ProfileSelect
                  label="Marital Status"
                  value={profileForm.marital_status}
                  onChange={(v) => setProfileForm({ ...profileForm, marital_status: v })}
                  options={MARITAL_STATUSES}
                  readOnly={!canEditWorkInfo}
                />
                <ProfileField label="Nationality" value={profileForm.nationality} onChange={(v) => setProfileForm({ ...profileForm, nationality: v })} readOnly={!canEditWorkInfo} />
              </div>
            </CardContent>
          </Card>

          {/* Address & Emergency */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <Home className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Address & Emergency Contact</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Home Address</Label>
                  <Textarea
                    value={profileForm.home_address}
                    onChange={(e) => setProfileForm({ ...profileForm, home_address: e.target.value })}
                    placeholder="Enter full home address..."
                    className="rounded-lg resize-none"
                    rows={3}
                    readOnly={!canEditWorkInfo}
                  />
                </div>
                <ProfileField label="Emergency Contact Name" value={profileForm.emergency_contact_name} onChange={(v) => setProfileForm({ ...profileForm, emergency_contact_name: v })} readOnly={!canEditWorkInfo} />
                <ProfileField label="Emergency Contact Phone" value={profileForm.emergency_contact_phone} onChange={(v) => setProfileForm({ ...profileForm, emergency_contact_phone: v })} readOnly={!canEditWorkInfo} />
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <Briefcase className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Work Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileField label="Employee ID" value={profileForm.employee_id} onChange={(v) => setProfileForm({ ...profileForm, employee_id: v })} readOnly={!canEditWorkInfo} />
                <ProfileField label="Job Title" value={profileForm.job_title} onChange={(v) => setProfileForm({ ...profileForm, job_title: v })} readOnly={!canEditWorkInfo} />
                <div className="space-y-2">
                  <Label>Department</Label>
                  {canEditWorkInfo ? (
                    <CreatableSelect
                      value={profileForm.department}
                      onChange={(v) => setProfileForm({ ...profileForm, department: v })}
                      table="departments"
                      orgId={profile?.org_id}
                      placeholder="Select or create department..."
                    />
                  ) : (
                    <Input
                      value={profileForm.department || '—'}
                      readOnly
                      className="rounded-lg bg-muted/50 cursor-not-allowed"
                    />
                  )}
                </div>
                <ProfileField label="Hire Date" type="date" value={profileForm.hire_date} onChange={(v) => setProfileForm({ ...profileForm, hire_date: v })} readOnly={!canEditWorkInfo} />
                <ProfileSelect
                  label="Employment Type"
                  value={profileForm.employment_type}
                  onChange={(v) => setProfileForm({ ...profileForm, employment_type: v })}
                  options={EMPLOYMENT_TYPES.map((t) => t.label)}
                  optionValues={EMPLOYMENT_TYPES.map((t) => t.value)}
                  readOnly={!canEditWorkInfo}
                />
                <ProfileSelect
                  label="Employment Status"
                  value={profileForm.employment_status}
                  onChange={(v) => setProfileForm({ ...profileForm, employment_status: v })}
                  options={EMPLOYMENT_STATUSES.map((s) => s.label)}
                  optionValues={EMPLOYMENT_STATUSES.map((s) => s.value)}
                  readOnly={!canEditWorkInfo}
                />
                <ProfileSelect
                  label="Role"
                  value={profileForm.role}
                  onChange={(v) => setProfileForm({ ...profileForm, role: v as Role })}
                  options={['Employee', 'Manager', 'HR Admin', 'Super Admin']}
                  optionValues={['employee', 'manager', 'hr_admin', 'super_admin']}
                  readOnly={!canEditWorkInfo}
                />
                <div className="space-y-2">
                  <Label>Manager</Label>
                  {canEditWorkInfo ? (
                    <Select value={profileForm.manager_id || '__none__'} onValueChange={(v) => setProfileForm({ ...profileForm, manager_id: v === '__none__' ? '' : v })}>
                      <SelectTrigger className="rounded-lg"><SelectValue placeholder="No manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No manager</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={managers.find((m) => m.id === profileForm.manager_id) ? `${managers.find((m) => m.id === profileForm.manager_id)!.first_name} ${managers.find((m) => m.id === profileForm.manager_id)!.last_name}` : 'No manager'}
                      readOnly
                      className="rounded-lg bg-muted/50 cursor-not-allowed"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                  <Wallet className="h-5 w-5 text-[#032364]" />
                </div>
                <CardTitle className="text-sm font-semibold text-[#051536]">Bank & Payroll Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ProfileField label="Bank Name" value={profileForm.bank_name} onChange={(v) => setProfileForm({ ...profileForm, bank_name: v })} readOnly={!canEditWorkInfo} />
                <ProfileField label="Bank Account Number" value={profileForm.bank_account_number} onChange={(v) => setProfileForm({ ...profileForm, bank_account_number: v })} readOnly={!canEditWorkInfo} />
              </div>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10 shrink-0 mt-0.5">
                    <Briefcase className="h-4 w-4 text-[#032364]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#051536]">Work Experience</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Add previous roles and relevant experience.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setExpDialog({ open: true, data: emptyExp, index: null })} className="rounded-lg shrink-0 ml-4 text-xs font-medium">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add experience
                </Button>
              </div>
              {experiences.length > 0 ? (
                <div className="space-y-3">
                  {experiences.map((exp, i) => (
                    <div key={i} className="flex items-start justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[#051536]">{exp.job_title}</p>
                        <p className="text-xs text-muted-foreground">{exp.company}</p>
                        {(exp.start_date || exp.end_date) && (
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.start_date} — {exp.end_date || 'Present'}</p>
                        )}
                        {exp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exp.description}</p>}
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpDialog({ open: true, data: exp, index: i })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setExperiences((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] py-8">
                  <p className="text-sm text-muted-foreground">No work experience added.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education Details */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10 shrink-0 mt-0.5">
                    <GraduationCap className="h-4 w-4 text-[#032364]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#051536]">Education Details</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Add qualifications and completed studies.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEduDialog({ open: true, data: emptyEdu, index: null })} className="rounded-lg shrink-0 ml-4 text-xs font-medium">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add education
                </Button>
              </div>
              {educations.length > 0 ? (
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEduDialog({ open: true, data: edu, index: i })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setEducations((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] py-8">
                  <p className="text-sm text-muted-foreground">No education details added.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dependent Details */}
          <Card className="rounded-xl border-0 bg-white vcgl-shadow">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10 shrink-0 mt-0.5">
                    <UsersIcon className="h-4 w-4 text-[#032364]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#051536]">Dependent Details</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Add family members or other dependents.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDepDialog({ open: true, data: emptyDep, index: null })} className="rounded-lg shrink-0 ml-4 text-xs font-medium">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add dependent
                </Button>
              </div>
              {dependents.length > 0 ? (
                <div className="space-y-3">
                  {dependents.map((dep, i) => (
                    <div key={i} className="flex items-start justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[#051536]">{dep.name}</p>
                        <p className="text-xs text-muted-foreground">{dep.relationship}{dep.gender ? ` · ${dep.gender}` : ''}</p>
                        {dep.date_of_birth && <p className="text-xs text-muted-foreground mt-0.5">DOB: {dep.date_of_birth}</p>}
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDepDialog({ open: true, data: dep, index: i })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDependents((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] py-8">
                  <p className="text-sm text-muted-foreground">No dependents added.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 w-full sm:w-auto px-8">
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        {isHr && (
          <TabsContent value="branding">
            <BrandingTab />
          </TabsContent>
        )}

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
                        <SelectTrigger className="w-full sm:w-[260px] rounded-lg">
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
                      <Button onClick={handleSaveBalances} disabled={savingBalances || !selectedEmployeeId} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 w-full sm:w-auto">
                        {savingBalances ? 'Saving...' : 'Save Balances'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Work Schedule Tab ────────────────────────────────────── */}
        {isHr && (
          <TabsContent value="work-schedule">
            <WorkScheduleTab orgId={profile?.org_id} />
          </TabsContent>
        )}

        {/* ── Compensation Tab ─────────────────────────────────────── */}
        {isHr && (
          <TabsContent value="compensation">
            <CompensationTab orgId={profile?.org_id} />
          </TabsContent>
        )}
      </Tabs>

      {/* Leave Type Dialog */}
      <Dialog open={ltDialog} onOpenChange={setLtDialog}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
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

      {/* Work Experience Dialog */}
      <Dialog open={expDialog.open} onOpenChange={(o) => !o && setExpDialog({ open: false, data: emptyExp, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{expDialog.index !== null ? 'Edit' : 'Add'} Work Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ProfileField label="Company Name" required value={expDialog.data.company} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, company: v } }))} placeholder="Company name" />
            <ProfileField label="Job Title" required value={expDialog.data.job_title} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, job_title: v } }))} placeholder="Job title" />
            <div className="grid grid-cols-2 gap-4">
              <ProfileField label="Start Date" type="date" value={expDialog.data.start_date} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, start_date: v } }))} />
              <ProfileField label="End Date" type="date" value={expDialog.data.end_date} onChange={(v) => setExpDialog((s) => ({ ...s, data: { ...s.data, end_date: v } }))} />
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
            <Button onClick={() => {
              const d = expDialog.data;
              if (!d.company || !d.job_title) { toast.error('Company and job title are required'); return; }
              setExperiences((prev) => {
                const next = [...prev];
                if (expDialog.index !== null) next[expDialog.index] = d;
                else next.push(d);
                return next;
              });
              setExpDialog({ open: false, data: emptyExp, index: null });
            }} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Education Dialog */}
      <Dialog open={eduDialog.open} onOpenChange={(o) => !o && setEduDialog({ open: false, data: emptyEdu, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{eduDialog.index !== null ? 'Edit' : 'Add'} Education</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ProfileField label="Institution" required value={eduDialog.data.institution} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, institution: v } }))} placeholder="University name" />
            <ProfileField label="Degree / Qualification" required value={eduDialog.data.degree} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, degree: v } }))} placeholder="e.g. B.Sc Computer Science" />
            <ProfileField label="Field of Study" value={eduDialog.data.field_of_study} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, field_of_study: v } }))} placeholder="Computer Science" />
            <div className="grid grid-cols-2 gap-4">
              <ProfileField label="Start Date" type="date" value={eduDialog.data.start_date} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, start_date: v } }))} />
              <ProfileField label="End Date" type="date" value={eduDialog.data.end_date} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, end_date: v } }))} />
            </div>
            <ProfileField label="Grade / Result" value={eduDialog.data.grade} onChange={(v) => setEduDialog((s) => ({ ...s, data: { ...s.data, grade: v } }))} placeholder="First Class / 4.0 GPA" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEduDialog({ open: false, data: emptyEdu, index: null })}>Cancel</Button>
            <Button onClick={() => {
              const d = eduDialog.data;
              if (!d.institution || !d.degree) { toast.error('Institution and degree are required'); return; }
              setEducations((prev) => {
                const next = [...prev];
                if (eduDialog.index !== null) next[eduDialog.index] = d;
                else next.push(d);
                return next;
              });
              setEduDialog({ open: false, data: emptyEdu, index: null });
            }} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependent Dialog */}
      <Dialog open={depDialog.open} onOpenChange={(o) => !o && setDepDialog({ open: false, data: emptyDep, index: null })}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{depDialog.index !== null ? 'Edit' : 'Add'} Dependent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ProfileField label="Full Name" required value={depDialog.data.name} onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, name: v } }))} placeholder="Full name" />
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={depDialog.data.relationship || '__none__'} onValueChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, relationship: v === '__none__' ? '' : v } }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ProfileField label="Date of Birth" type="date" value={depDialog.data.date_of_birth} onChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, date_of_birth: v } }))} />
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={depDialog.data.gender || '__none__'} onValueChange={(v) => setDepDialog((s) => ({ ...s, data: { ...s.data, gender: v === '__none__' ? '' : v } }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepDialog({ open: false, data: emptyDep, index: null })}>Cancel</Button>
            <Button onClick={() => {
              const d = depDialog.data;
              if (!d.name || !d.relationship) { toast.error('Name and relationship are required'); return; }
              setDependents((prev) => {
                const next = [...prev];
                if (depDialog.index !== null) next[depDialog.index] = d;
                else next.push(d);
                return next;
              });
              setDepDialog({ open: false, data: emptyDep, index: null });
            }} className="bg-[#032364] hover:bg-[#032364]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileField({
  label, value, onChange, type = 'text', required, readOnly, placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
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
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`rounded-lg ${readOnly ? 'bg-muted/50 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

function ProfileSelect({
  label, value, onChange, options, optionValues, readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  options: string[];
  optionValues?: string[];
  readOnly?: boolean;
}) {
  const displayValues = optionValues ?? options;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {readOnly ? (
        <Input
          value={options[displayValues.indexOf(value)] ?? value}
          readOnly
          className="rounded-lg bg-muted/50 cursor-not-allowed"
        />
      ) : (
        <Select value={value || '__none__'} onValueChange={onChange ? (v) => onChange(v === '__none__' ? '' : v) : undefined}>
          <SelectTrigger className="rounded-lg">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {displayValues.map((val, i) => (
              <SelectItem key={val} value={val}>{options[i]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ─── Work Schedule Tab ──────────────────────────────────────────────────────

function WorkScheduleTab({ orgId }: { orgId?: string }) {
  const [schedule, setSchedule] = useState({ start_time: '09:00', end_time: '17:00', grace_minutes: 15, work_hours: 8, break_minutes: 60 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getWorkSchedule(orgId).then((s) => {
      if (s) {
        setSchedule({
          start_time: s.start_time,
          end_time: s.end_time,
          grace_minutes: s.grace_minutes,
          work_hours: s.work_hours,
          break_minutes: s.break_minutes,
        });
      }
      setLoading(false);
    });
  }, [orgId]);

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    await updateWorkSchedule(orgId, schedule);
    toast.success('Work schedule updated');
    setSaving(false);
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-[#0e3a94] mx-auto mt-8" />;

  return (
    <Card className="rounded-xl border-0 bg-white vcgl-shadow">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
            <Clock className="h-5 w-5 text-[#032364]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#051536]">Work Schedule</h3>
            <p className="text-xs text-muted-foreground">Configure standard work hours and attendance rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="time" value={schedule.start_time} onChange={(e) => setSchedule({ ...schedule, start_time: e.target.value })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="time" value={schedule.end_time} onChange={(e) => setSchedule({ ...schedule, end_time: e.target.value })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Work Hours per Day</Label>
            <Input type="number" min={1} max={24} step={0.5} value={schedule.work_hours} onChange={(e) => setSchedule({ ...schedule, work_hours: parseFloat(e.target.value) || 8 })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Grace Period (minutes)</Label>
            <Input type="number" min={0} max={120} value={schedule.grace_minutes} onChange={(e) => setSchedule({ ...schedule, grace_minutes: parseInt(e.target.value) || 0 })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label>Break Duration (minutes)</Label>
            <Input type="number" min={0} max={240} value={schedule.break_minutes} onChange={(e) => setSchedule({ ...schedule, break_minutes: parseInt(e.target.value) || 0 })} className="rounded-lg" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
          <p className="text-xs text-muted-foreground">
            Employees checking in after <strong>{schedule.start_time}</strong> + {schedule.grace_minutes} min grace period will be marked as <strong>late</strong>.
            Working less than {schedule.work_hours} hours counts as <strong>half day</strong>.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Schedule
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Compensation Tab ───────────────────────────────────────────────────────

function CompensationTab({ orgId }: { orgId?: string }) {
  const [employees, setEmployees] = useState<(Profile & { compensation?: { base_salary: number; currency: string; pay_frequency: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmployee, setEditEmployee] = useState<string | null>(null);
  const [compForm, setCompForm] = useState({ base_salary: '', currency: 'USD', pay_frequency: 'monthly' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const { data: emps } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('org_id', orgId!)
        .eq('is_active', true)
        .order('first_name');

      const compData = await getAllCompensation(orgId!);
      const compMap = new Map(compData.map((c) => [c.employee_id, c]));

      setEmployees((emps as Profile[] || []).map((e) => ({
        ...e,
        compensation: compMap.get(e.id) ? { base_salary: compMap.get(e.id)!.base_salary, currency: compMap.get(e.id)!.currency, pay_frequency: compMap.get(e.id)!.pay_frequency } : null,
      })));
      setLoading(false);
    }
    load();
  }, [orgId]);

  async function handleSaveComp() {
    if (!editEmployee || !orgId) return;
    setSaving(true);
    const salary = parseFloat(compForm.base_salary);
    if (isNaN(salary) || salary < 0) {
      toast.error('Please enter a valid salary');
      setSaving(false);
      return;
    }
    const result = await upsertCompensation(editEmployee, orgId, salary, compForm.currency, compForm.pay_frequency as 'hourly' | 'weekly' | 'biweekly' | 'monthly');
    if (result) {
      toast.success('Compensation updated');
      setEmployees((prev) => prev.map((e) => e.id === editEmployee ? { ...e, compensation: { base_salary: salary, currency: compForm.currency, pay_frequency: compForm.pay_frequency } } : e));
    } else {
      toast.error('Failed to update compensation');
    }
    setSaving(false);
    setEditEmployee(null);
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-[#0e3a94] mx-auto mt-8" />;

  return (
    <Card className="rounded-xl border-0 bg-white vcgl-shadow">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
            <Wallet className="h-5 w-5 text-[#032364]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#051536]">Employee Compensation</h3>
            <p className="text-xs text-muted-foreground">Set base salary and pay frequency for payroll calculation</p>
          </div>
        </div>

        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border border-[#e2e8f0]">
              <div>
                <p className="text-sm font-medium text-[#051536]">{emp.first_name} {emp.last_name}</p>
                <p className="text-xs text-muted-foreground">{emp.employee_id || emp.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {emp.compensation ? (
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#051536]">{formatCurrency(emp.compensation.base_salary, emp.compensation.currency)}</p>
                    <p className="text-xs text-muted-foreground">{getPayFrequencyLabel(emp.compensation.pay_frequency)}</p>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600">Not set</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditEmployee(emp.id);
                    setCompForm({
                      base_salary: emp.compensation?.base_salary?.toString() || '',
                      currency: emp.compensation?.currency || 'USD',
                      pay_frequency: emp.compensation?.pay_frequency || 'monthly',
                    });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editEmployee} onOpenChange={(o) => !o && setEditEmployee(null)}>
          <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>Set Compensation</DialogTitle>
              <DialogDescription>Configure base salary and pay frequency</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Base Salary *</Label>
                <Input type="number" min={0} step={0.01} value={compForm.base_salary} onChange={(e) => setCompForm({ ...compForm, base_salary: e.target.value })} className="rounded-lg" placeholder="e.g., 5000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={compForm.currency} onValueChange={(v) => setCompForm({ ...compForm, currency: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pay Frequency</Label>
                  <Select value={compForm.pay_frequency} onValueChange={(v) => setCompForm({ ...compForm, pay_frequency: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEmployee(null)}>Cancel</Button>
              <Button onClick={handleSaveComp} disabled={saving} className="bg-[#032364] hover:bg-[#032364]/90">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
