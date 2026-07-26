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
  subscription: { plan_id: string; status: string } | null;
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

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editMaxEmployees, setEditMaxEmployees] = useState(0);

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
        supabase.from('subscriptions').select('plan_id, status').eq('org_id', id).maybeSingle(),
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
    setSaving(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token') ?? ''}`,
        },
        body: JSON.stringify({
          id: org.id,
          name: editName,
          plan: editPlan,
          max_employees: editMaxEmployees,
        }),
      });

      if (res.ok && org) {
        setOrg({ ...org, name: editName, plan: editPlan, max_employees: editMaxEmployees });
        toast.success('Organization updated successfully');
      } else {
        toast.error('Failed to update organization');
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
    enterprise: 'bg-amber-100 text-amber-700',
  };

  const roleBadge: Record<string, string> = {
    employee: 'bg-gray-100 text-gray-700',
    manager: 'bg-blue-100 text-blue-700',
    hr_admin: 'bg-purple-100 text-purple-700',
    super_admin: 'bg-amber-100 text-amber-700',
  };

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

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
                onChange={(e) => setEditPlan(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Professional</option>
                <option value="enterprise">Enterprise</option>
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
