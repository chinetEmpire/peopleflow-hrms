import { getSupabase, Invitation, Role } from './supabase';

/**
 * Invite a member to the organization
 */
export async function inviteMember(
  email: string,
  role: Role = 'employee',
  orgId?: string
): Promise<{ invitation?: Invitation; token?: string; error?: string }> {
  const { data, error } = await getSupabase().rpc('invite_member', {
    p_email: email,
    p_role: role,
    p_org_id: orgId || null,
  });

  if (error) {
    console.error('Error inviting member:', error);
    return { error: error.message };
  }

  const result = data as Record<string, unknown>;

  if (result?.error) {
    return { error: result.error as string };
  }

  return {
    invitation: {
      id: result.id as string,
      org_id: result.org_id as string,
      email: result.email as string,
      role: result.role as Role,
      invited_by: '',
      token: result.token as string,
      status: 'pending',
      expires_at: '',
      accepted_at: null,
      created_at: new Date().toISOString(),
    },
    token: result.token as string,
  };
}

/**
 * Accept an invitation
 */
export async function acceptInvite(
  token: string,
  userId?: string
): Promise<{ success?: boolean; orgId?: string; role?: string; error?: string }> {
  const { data, error } = await getSupabase().rpc('accept_invite', {
    p_token: token,
    p_user_id: userId || null,
  });

  if (error) {
    console.error('Error accepting invitation:', error);
    return { error: error.message };
  }

  const result = data as Record<string, unknown>;

  if (result?.error) {
    return { error: result.error as string };
  }

  return {
    success: result.success as boolean,
    orgId: result.org_id as string,
    role: result.role as string,
  };
}

/**
 * Get pending invitations for the organization
 */
export async function getPendingInvitations(orgId?: string): Promise<Invitation[]> {
  const { data, error } = await getSupabase().rpc('get_pending_invitations', {
    p_org_id: orgId || null,
  });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return (data || []) as Invitation[];
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) {
    console.error('Error revoking invitation:', error);
    return false;
  }

  return true;
}

/**
 * Validate an invitation token
 */
export async function validateInvitationToken(
  token: string
): Promise<{ valid: boolean; invitation?: Invitation; error?: string }> {
  const { data, error } = await getSupabase()
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or expired invitation' };
  }

  const invitation = data as Invitation;

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return { valid: false, error: 'This invitation has expired' };
  }

  return { valid: true, invitation };
}

/**
 * Create organization with admin user (registration)
 */
export async function createOrganizationWithAdmin(
  orgName: string,
  orgSlug: string,
  adminEmail: string,
  adminFirstName: string,
  adminLastName: string,
  adminPassword: string
): Promise<{ orgId?: string; orgSlug?: string; error?: string }> {
  const { data, error } = await getSupabase().rpc('create_organization_with_admin', {
    org_name: orgName,
    org_slug: orgSlug,
    admin_email: adminEmail,
    admin_first_name: adminFirstName,
    admin_last_name: adminLastName,
    admin_password: adminPassword,
  });

  if (error) {
    console.error('Error creating organization:', error);
    return { error: error.message };
  }

  const result = data as Record<string, unknown>;

  if (result?.error) {
    return { error: result.error as string };
  }

  return {
    orgId: result.org_id as string,
    orgSlug: result.org_slug as string,
  };
}
