'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Plus,
  X,
  Users,
  Calendar,
  PartyPopper,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
  Trash2,
} from 'lucide-react';

const DEFAULT_DEPARTMENTS = [
  'Human Resources',
  'Engineering',
  'Marketing',
  'Finance',
  'Operations',
  'Sales',
  'Customer Support',
  'Legal',
];

const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', days: 20, color: '#3b82f6' },
  { name: 'Sick Leave', days: 10, color: '#ef4444' },
  { name: 'Personal Leave', days: 5, color: '#8b5cf6' },
  { name: 'Maternity Leave', days: 90, color: '#ec4899' },
  { name: 'Paternity Leave', days: 14, color: '#06b6d4' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, organization, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [leaveTypes, setLeaveTypes] = useState(DEFAULT_LEAVE_TYPES);
  const [inviteEmails, setInviteEmails] = useState<{ email: string; role: string }[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newDept, setNewDept] = useState('');
  const [customDays, setCustomDays] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace('/login');
    }
  }, [profile, authLoading, router]);

  function addDepartment(name: string) {
    if (name.trim() && !departments.includes(name.trim())) {
      setDepartments([...departments, name.trim()]);
      setNewDept('');
    }
  }

  function removeDepartment(name: string) {
    setDepartments(departments.filter((d) => d !== name));
  }

  function toggleDefaultDept(name: string) {
    if (departments.includes(name)) {
      removeDepartment(name);
    } else {
      addDepartment(name);
    }
  }

  function addInvite() {
    if (newEmail.trim() && !inviteEmails.some((i) => i.email === newEmail.trim())) {
      setInviteEmails([...inviteEmails, { email: newEmail.trim(), role: newRole }]);
      setNewEmail('');
    }
  }

  function removeInvite(email: string) {
    setInviteEmails(inviteEmails.filter((i) => i.email !== email));
  }

  async function saveDepartments() {
    if (!organization) return;
    for (const dept of departments) {
      await getSupabase().rpc('create_department', {
        dept_name: dept,
        p_org_id: organization.id,
      });
    }
  }

  async function saveLeaveTypes() {
    if (!organization) return;
    for (const lt of leaveTypes) {
      const days = customDays[lt.name] ?? lt.days;
      await getSupabase().from('leave_types').insert({
        org_id: organization.id,
        name: lt.name,
        days_allowed: days,
        color: lt.color,
        is_active: true,
      });
    }
  }

  async function sendInvites() {
    if (!organization) return;
    for (const inv of inviteEmails) {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await getSupabase().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'invite',
          email: inv.email,
          role: inv.role,
        }),
      });
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await saveDepartments();
      await saveLeaveTypes();
      if (inviteEmails.length > 0) {
        await sendInvites();
      }
      router.push('/dashboard');
    } catch {
      // Continue to dashboard even if some saves fail
      router.push('/dashboard');
    }
  }

  function handleSkip() {
    router.push('/dashboard');
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2e9e9] via-[#e8e1f0] to-[#f2e9e9] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#032364] shadow-lg">
            <PartyPopper className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#032364]">
            Welcome to {organization?.display_name || organization?.name || 'Your Organization'}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let&apos;s set up your HR platform (you can skip this and do it later)
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {['Departments', 'Leave Types', 'Invite Team'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  step > i + 1
                    ? 'bg-green-500 text-white'
                    : step === i + 1
                    ? 'bg-[#032364] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > i + 1 ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < 2 && <div className={`h-0.5 w-8 ${step > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card className="border-0 bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.15)] rounded-2xl">
          <CardContent className="p-8">
            {/* Step 1: Departments */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#032364]">Set Up Departments</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose common departments or add your own
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DEFAULT_DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDefaultDept(dept)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        departments.includes(dept)
                          ? 'bg-[#032364] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDepartment(newDept);
                      }
                    }}
                    placeholder="Add custom department"
                    className="h-10 rounded-lg border-[#0000004c]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addDepartment(newDept)}
                    disabled={!newDept.trim()}
                    className="h-10 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {departments.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Selected ({departments.length})</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map((dept) => (
                        <span
                          key={dept}
                          className="inline-flex items-center gap-1 rounded-md bg-[#032364]/10 px-2 py-1 text-xs font-medium text-[#032364]"
                        >
                          {dept}
                          <button type="button" onClick={() => removeDepartment(dept)}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Leave Types */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#032364]">Set Up Leave Types</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure the leave types available for your employees
                  </p>
                </div>

                <div className="space-y-3">
                  {leaveTypes.map((lt, idx) => (
                    <div key={lt.name} className="flex items-center gap-3 rounded-lg border p-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: lt.color }}
                      />
                      <span className="flex-1 text-sm font-medium">{lt.name}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          value={customDays[lt.name] ?? lt.days}
                          onChange={(e) =>
                            setCustomDays({
                              ...customDays,
                              [lt.name]: parseInt(e.target.value) || lt.days,
                            })
                          }
                          className="h-8 w-16 rounded-md border-[#0000004c] text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Invite Team */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#032364]">Invite Team Members</h2>
                  <p className="text-sm text-muted-foreground">
                    Send invitations to your team (you can do this later)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInvite();
                      }
                    }}
                    placeholder="colleague@company.com"
                    className="h-10 flex-1 rounded-lg border-[#0000004c]"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="h-10 rounded-lg border border-[#0000004c] px-3 text-sm"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr_admin">HR Admin</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addInvite}
                    disabled={!newEmail.trim()}
                    className="h-10 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {inviteEmails.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Invitations ({inviteEmails.length})
                    </Label>
                    {inviteEmails.map((inv) => (
                      <div
                        key={inv.email}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{inv.email}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                            {inv.role.replace('_', ' ')}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeInvite(inv.email)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {inviteEmails.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No invitations yet. You can invite team members later from the dashboard.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="h-11 rounded-lg text-muted-foreground"
              >
                Skip for now
              </Button>

              <div className="flex-1" />

              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="h-11 rounded-lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="h-11 rounded-lg bg-[#032364] text-white hover:opacity-90"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="h-11 rounded-lg bg-[#032364] text-white hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Finish Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
