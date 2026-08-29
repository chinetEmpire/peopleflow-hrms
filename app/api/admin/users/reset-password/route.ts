import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';

// No ambiguous characters (0/O, 1/l/I, etc.) — avoids password entry errors.
const PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TEMP_PASSWORD_LENGTH = 16;
const RESET_VALID_HOURS = 24;

function generateTempPassword(): string {
  const bytes = crypto.randomBytes(TEMP_PASSWORD_LENGTH);
  let out = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    out += PASSWORD_CHARSET[bytes[i] % PASSWORD_CHARSET.length];
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`reset-password:${auth.user.id}`, 'auth');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const body = await req.json();
    const { user_id } = body;
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, org_id, is_active')
      .eq('id', user_id)
      .maybeSingle();
    if (targetError || !target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Protect against one platform admin locking out another.
    if (target.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot reset password of another platform admin' }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + RESET_VALID_HOURS * 3600000);

    const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, { password: tempPassword });
    if (updateError) {
      console.error('[admin/users/reset-password] Supabase update failed:', updateError.message);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Audit trail — the temp password itself is NEVER stored.
    await supabase.from('password_resets').insert({
      user_id,
      org_id: target.org_id ?? null,
      requested_by: auth.user.id,
      status: 'issued',
      expires_at: expiresAt.toISOString(),
    });

    await supabase
      .from('profiles')
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq('id', user_id);

    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: target.org_id ?? null,
      action: 'password_reset',
      entity: 'profile',
      entity_id: user_id,
      details: {
        target_email: target.email,
        target_role: target.role,
        expires_at: expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      temp_password: tempPassword,
      expires_at: expiresAt.toISOString(),
      user: { id: target.id, email: target.email, name: `${target.first_name} ${target.last_name}`.trim() },
    });
  } catch (err) {
    console.error('[admin/users/reset-password] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}