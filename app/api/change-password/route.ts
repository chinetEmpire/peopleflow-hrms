import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyToken } from '@/lib/supabase-admin';
import { isValidPassword } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const user = await verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`change-password:${user.id}`, 'auth');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const body = await req.json();
    const { new_password } = body;
    const check = isValidPassword(new_password);
    if (!check.valid) {
      return NextResponse.json({ error: check.error ?? 'Invalid password' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: new_password });
    if (error) {
      console.error('[change-password] update failed:', error.message);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, org_id, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.must_change_password) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    // Mark any outstanding issued resets as used.
    await supabase
      .from('password_resets')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'issued');

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      org_id: profile?.org_id ?? null,
      action: 'password_changed',
      entity: 'profile',
      entity_id: user.id,
      details: { source: profile?.must_change_password ? 'force_change' : 'self_service' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}