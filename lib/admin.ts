import { getSupabase, Organization, Profile } from './supabase';

export interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  planBreakdown: { plan: string; count: number }[];
  recentSignups: Profile[];
  orgsAtLimit: { org: Organization; usage: number; limit: number }[];
}

export interface AdminOrganization extends Organization {
  user_count: number;
  department_count: number;
  subscription?: {
    plan_id: string;
    status: string;
  } | null;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = getSupabase();

  const [
    { count: totalOrgs },
    { count: totalUsers },
    { count: activeUsers },
    { count: totalDepts },
    { data: orgs },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*'),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const planMap = new Map<string, number>();
  (orgs ?? []).forEach((org) => {
    planMap.set(org.plan, (planMap.get(org.plan) ?? 0) + 1);
  });

  const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }));

  return {
    totalOrganizations: totalOrgs ?? 0,
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    totalDepartments: totalDepts ?? 0,
    planBreakdown,
    recentSignups: (profiles ?? []) as Profile[],
    orgsAtLimit: [],
  };
}

export async function getAllOrganizations(): Promise<AdminOrganization[]> {
  const supabase = getSupabase();

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (!orgs) return [];

  const results: AdminOrganization[] = [];

  for (const org of orgs) {
    const [
      { count: userCount },
      { count: deptCount },
      { data: sub },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('subscriptions').select('plan_id, status').eq('org_id', org.id).maybeSingle(),
    ]);

    results.push({
      ...(org as Organization),
      user_count: userCount ?? 0,
      department_count: deptCount ?? 0,
      subscription: sub,
    });
  }

  return results;
}

export async function getOrganizationById(orgId: string): Promise<AdminOrganization | null> {
  const supabase = getSupabase();

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (!org) return null;

  const [
    { count: userCount },
    { count: deptCount },
    { data: sub },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('subscriptions').select('plan_id, status').eq('org_id', orgId).maybeSingle(),
  ]);

  return {
    ...(org as Organization),
    user_count: userCount ?? 0,
    department_count: deptCount ?? 0,
    subscription: sub,
  };
}

export async function getAllUsers(page: number = 1, pageSize: number = 20): Promise<{ users: Profile[]; total: number }> {
  const supabase = getSupabase();
  const offset = (page - 1) * pageSize;

  const { data: users, count } = await supabase
    .from('profiles')
    .select('*, organization:organizations(name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    users: (users ?? []) as unknown as Profile[],
    total: count ?? 0,
  };
}

export async function updateUserRole(userId: string, role: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  return !error;
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  return !error;
}

export async function updateOrganization(orgId: string, updates: Partial<Organization>): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  return !error;
}
