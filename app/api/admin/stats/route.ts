import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}

async function verifySuperAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'super_admin') return null;
  return data.user;
}

export async function GET(req: Request) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [
      { count: totalOrgs },
      { count: totalUsers },
      { count: activeUsers },
      { count: totalDepts },
      { data: orgs },
      { data: recentProfiles },
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('departments').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*'),
      supabase.from('profiles').select('id, first_name, last_name, email, created_at, org_id').order('created_at', { ascending: false }).limit(5),
    ]);

    const planMap = new Map<string, number>();
    (orgs ?? []).forEach((org: any) => {
      planMap.set(org.plan, (planMap.get(org.plan) ?? 0) + 1);
    });

    const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }));

    return NextResponse.json({
      totalOrganizations: totalOrgs ?? 0,
      totalUsers: totalUsers ?? 0,
      activeUsers: activeUsers ?? 0,
      inactiveUsers: (totalUsers ?? 0) - (activeUsers ?? 0),
      totalDepartments: totalDepts ?? 0,
      planBreakdown,
      recentSignups: recentProfiles ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
