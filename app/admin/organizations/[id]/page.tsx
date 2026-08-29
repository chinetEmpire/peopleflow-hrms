'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  FolderOpen,
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  CreditCard,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  plan: string;
  max_employees: number;
  created_at: string;
  billing_email: string | null;
  user_count: number;
  department_count: number;
  subscription: {
    plan_id: string;
    status: string;
    billing_cycle: string;
    current_period_end: string;
  } | null;
}

interface OrgMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
}

const PLANS = [
  { value: 'free', label: 'Free', maxEmployees: 10 },
  { value: 'starter', label: 'Starter', maxEmployees: 20 },
  { value: 'pro', label: 'Professional', maxEmployees: 50 },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-700',
};

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, session } = useAuth();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editMaxEmployees, setEditMaxEmployees] = useState(0);
  const [editBillingCycle, setEditBillingCycle] = useState('monthly');

  useEffect(() => {
    async function loadOrg() {
      if (!id) return;
      const supabase = getSupabase();

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (!orgData) {
        setLoading(false);
        return;
      }

      const [
        { count: userCount },
        { count: deptCount },
        { data: sub },
        { data: membersData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', id),
        supabase.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', id),
        supabase.from('subscriptions').select('plan_id, status, billing_cycle, current_period_end').eq('org_id', id).maybeSingle(),
        supabase.from('profiles').select('id, first_name, last_name, email, role, job_title, is_active, created_at').eq('org_id', id).order('created_at', { ascending: false }),
      ]);

      setOrg({
        ...orgData,
        user_count: userCount ?? 0,
        department_count: deptCount ?? 0,
        subscription: sub,
      });
      setEditName(orgData.name);
      setEditPlan(orgData.plan);
      setEditMaxEmployees(orgData.max_employees);
      setEditBillingCycle(sub?.billing_cycle || 'monthly');
      setMembers((membersData ?? []) as unknown as OrgMember[]);
      setLoading(false);
    }

    loadOrg();
  }, [id]);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Organization not found.</p>
        <Link href="/admin/organizations">
          <Button variant="outline" className="mt-4 rounded-lg">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
          </Button>
        </Link>
      </div>
    );
  }

  async function handleSave() {
    if (!org) return;

    const planChanged = editPlan !== org.plan;
    const cycleChanged = editBillingCycle !== (org.subscription?.billing_cycle || 'monthly');

    if (planChanged && org.user_count > 0) {
      const newPlan = PLANS.find(p => p.value === editPlan);
      if (newPlan && newPlan.maxEmployees !== -1 && org.user_count > newPlan.maxEmployees) {
        if (!confirm(`Warning: This org has ${org.user_count} users but the ${newPlan.label} plan allows ${newPlan.maxEmployees}. Existing users won't be removed, but new employee creation will be blocked. Continue?`)) {
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          id: org.id,
          name: editName,
          plan: editPlan,
          max_employees: editMaxEmployees,
          billing_cycle: editBillingCycle,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const newPlan = PLANS.find(p => p.value === editPlan);
        setOrg({
          ...org,
          name: editName,
          plan: editPlan,
          max_employees: newPlan?.maxEmployees ?? editMaxEmployees,
          subscription: org.subscription
            ? { ...org.subscription, plan_id: editPlan, billing_cycle: editBillingCycle }
            : { plan_id: editPlan, status: 'active', billing_cycle: editBillingCycle, current_period_end: new Date(Date.now() + (editBillingCycle === 'yearly' ? 365 : 30) * 86400000).toISOString() },
        });
        toast.success(data.subscription_updated ? 'Plan updated and subscription synced' : 'Organization updated');
      } else {
        toast.error(data.error || 'Failed to update organization');
      }
    } catch {
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
    }
  }

  const planBadge: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
  };

  const roleBadge: Record<string, string> = {
    employee: 'bg-gray-100 text-gray-700',
    manager: 'bg-blue-100 text-blue-700',
    hr_admin: 'bg-purple-100 text-purple-700',
    super_admin: 'bg-amber-100 text-amber-700',
  };

  const selectedPlan = PLANS.find(p => p.value === editPlan);
  const isOverLimit = selectedPlan && selectedPlan.maxEmployees !== -1 && org.user_count > selectedPlan.maxEmployees;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/organizations">
          <Button variant="ghost" size="sm" className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#051536]">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organization details and management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-semibold text-[#051536]">{org.user_count}</p>
              </div>
              <Users className="h-6 w-6 text-[#032364]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-semibold text-[#051536]">{org.department_count}</p>
              </div>
              <FolderOpen className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge className={planBadge[org.plan] ?? 'bg-gray-100 text-gray-700'}>
                  {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                </Badge>
              </div>
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscription</p>
                <Badge className={statusColors[org.subscription?.status ?? 'active'] ?? 'bg-gray-100 text-gray-700'}>
                  {org.subscription?.status ?? 'none'}
                </Badge>
              </div>
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Info */}
      {org.subscription && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536] flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={statusColors[org.subscription.status] ?? 'bg-gray-100 text-gray-700'}>
                  {org.subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Billing Cycle</p>
                <p className="text-sm font-medium text-[#051536] capitalize">{org.subscription.billing_cycle}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Period Ends</p>
                <p className="text-sm font-medium text-[#051536]">
                  {new Date(org.subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employee Limit</p>
                <p className="text-sm font-medium text-[#051536]">
                  {org.max_employees === -1 ? 'Unlimited' : org.max_employees}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Organization */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#051536]">Organization Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={org.slug}
                disabled
                className="rounded-lg bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <select
                value={editPlan}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditPlan(val);
                  const plan = PLANS.find(p => p.value === val);
                  if (plan) {
                    setEditMaxEmployees(plan.maxEmployees === -1 ? -1 : plan.maxEmployees);
                  }
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {PLANS.map(p => (
                  <option key={p.value} value={p.value}>{p.label} ({p.maxEmployees === -1 ? 'Unlimited' : p.maxEmployees} employees)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <select
                value={editBillingCycle}
                onChange={(e) => setEditBillingCycle(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Max Employees</Label>
              <Input
                type="number"
                value={editMaxEmployees}
                onChange={(e) => setEditMaxEmployees(parseInt(e.target.value) || 0)}
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground">-1 = unlimited</p>
            </div>
          </div>

          {isOverLimit && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                This org has {org.user_count} users but the selected plan allows {selectedPlan?.maxEmployees}. New employee creation will be blocked until the plan is upgraded or users are removed.
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#051536]">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No members in this organization.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-2 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#032364] text-sm font-semibold text-white shrink-0">
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#051536]">{member.first_name} {member.last_name}</span>
                      <Badge className={roleBadge[member.role] ?? 'bg-gray-100 text-gray-700'}>
                        {member.role.replace('_', ' ')}
                      </Badge>
                      {!member.is_active && (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      {member.job_title && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {member.job_title}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
