import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { isValidRole } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20');
    const orgId = url.searchParams.get('orgId');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    const supabase = getSupabaseAdmin();
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('profiles')
      .select('*, organization:organizations(name, slug)', { count: 'exact' });

    if (orgId) {
      query = query.eq('org_id', orgId);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    return NextResponse.json({
      users: users ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Failed to list users:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, role, is_active } = body;
    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    if (role !== undefined && !isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_active value' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Look up the target user's org_id for the audit log
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', id)
      .maybeSingle();

    if (!targetProfile?.org_id) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: targetProfile.org_id,
      action: 'update',
      entity: 'user',
      entity_id: id,
      details: { fields: Object.keys(updates), role, is_active },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update user:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
