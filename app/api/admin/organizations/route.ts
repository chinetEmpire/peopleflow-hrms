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

    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!orgs) return NextResponse.json({ organizations: [] });

    const results = await Promise.all(
      orgs.map(async (org: any) => {
        const [
          { count: userCount },
          { count: deptCount },
          { data: sub },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
          supabase.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
          supabase.from('subscriptions').select('plan_id, status').eq('org_id', org.id).maybeSingle(),
        ]);

        return {
          ...org,
          user_count: userCount ?? 0,
          department_count: deptCount ?? 0,
          subscription: sub,
        };
      })
    );

    return NextResponse.json({ organizations: results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing organization id' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      org_id: id,
      action: 'update',
      entity: 'organization',
      entity_id: id,
      details: { fields: Object.keys(updates) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
