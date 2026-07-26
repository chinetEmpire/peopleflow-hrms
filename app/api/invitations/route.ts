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

async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    // Check caller permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'hr_admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role = 'employee', action } = body;

    if (action === 'invite') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Check for existing pending invitation
      const { data: existing } = await supabaseAdmin
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('org_id', profile.org_id)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 400 });
      }

      // Generate token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .insert({
          org_id: profile.org_id,
          email,
          role,
          invited_by: user.id,
          token,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
        },
      });
    }

    if (action === 'revoke') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('org_id', profile.org_id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Invitation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'hr_admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only admins can view invitations' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .select('*, profiles:invited_by(first_name, last_name)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invitations = (data || []).map((inv: Record<string, unknown>) => ({
      ...inv,
      invited_by_name: inv.profiles
        ? `${(inv.profiles as Record<string, string>).first_name} ${(inv.profiles as Record<string, string>).last_name}`
        : 'Unknown',
    }));

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error('Error fetching invitations:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
