import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyHrAdmin } from '@/lib/supabase-admin';
import { isValidRole } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const auth = await verifyHrAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { user, profile } = auth;
    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json();
    const { email, role = 'employee', action } = body;

    if (action === 'invite') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      if (role && !isValidRole(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      if (profile.role === 'hr_admin' && (role === 'hr_admin' || role === 'super_admin')) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await verifyHrAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile } = auth;
    const supabaseAdmin = getSupabaseAdmin();

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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
