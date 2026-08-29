import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { isValidRole } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

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

    const limit = checkRateLimit(`admin-users:${auth.user.id}`, 'admin');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const body = await req.json();
    const { id, role, is_active } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    if (role !== undefined && !isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_active value' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Role assignments go through the assign_admin_role RPC, which verifies
    // the caller is a current super_admin in the database, audits the change,
    // and is the only path that can grant/revoke the super_admin role.
    if (role !== undefined) {
      const { error: rpcError } = await supabase.rpc('assign_admin_role', {
        caller_id: auth.user.id,
        target_id: id,
        new_role: role,
      });

      if (rpcError) {
        console.error('[admin/users] assign_admin_role failed:', rpcError.message);
        return NextResponse.json({ error: rpcError.message || 'Failed to update role' }, { status: 400 });
      }
    }

    const updates: Record<string, any> = {};
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Look up the target user's org_id for the audit log.
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', id)
        .maybeSingle();

      if (!targetProfile) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }

      await supabase.from('audit_logs').insert({
        actor_id: auth.user.id,
        org_id: targetProfile.org_id ?? null,
        action: 'update',
        entity: 'user',
        entity_id: id,
        details: { fields: Object.keys(updates), is_active },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update user:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
