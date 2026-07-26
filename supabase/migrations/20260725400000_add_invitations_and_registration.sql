/*
  Phase 3: Organization Registration & Invitations
  
  Summary:
  - Creates invitations table for org member invites
  - Adds create_organization_with_admin() for self-service registration
  - Adds invite_member() and accept_invite() functions
  - RLS policies for invitation management
*/

-- ============================================================
-- 1. CREATE INVITATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr_admin', 'super_admin')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ENABLE RLS ON INVITATIONS
-- ============================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES — INVITATIONS
-- ============================================================

-- Org admins can view invitations for their org
DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select" ON invitations FOR SELECT
TO authenticated USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Org admins can create invitations for their org
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = invitations.org_id)
  )
);

-- Org admins can update invitations (revoke)
DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update" ON invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = invitations.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = invitations.org_id)
  )
);

-- Org admins can delete invitations
DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = invitations.org_id)
  )
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- ============================================================
-- 5. DATABASE FUNCTIONS
-- ============================================================

-- Function: Create organization with admin user (used during registration)
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  org_slug TEXT,
  admin_email TEXT,
  admin_first_name TEXT,
  admin_last_name TEXT,
  admin_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- Check slug availability
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) THEN
    RETURN jsonb_build_object('error', 'Organization slug already exists');
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, slug, plan, max_employees)
  VALUES (org_name, org_slug, 'free', 10)
  RETURNING id INTO new_org_id;

  -- Create the admin user via Supabase Auth
  -- Note: This uses the auth.admin API via service role
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF new_user_id IS NULL THEN
    -- User doesn't exist, we need to create via the API
    -- This function is called from the API route which has service role access
    RETURN jsonb_build_object(
      'org_id', new_org_id,
      'org_slug', org_slug,
      'create_user', true,
      'email', admin_email,
      'first_name', admin_first_name,
      'last_name', admin_last_name,
      'password', admin_password
    );
  ELSE
    -- User exists, just update their profile to link to this org
    UPDATE profiles SET org_id = new_org_id, role = 'super_admin'
    WHERE id = new_user_id;

    RETURN jsonb_build_object(
      'org_id', new_org_id,
      'org_slug', org_slug,
      'create_user', false,
      'user_id', new_user_id
    );
  END IF;
END;
$$;

-- Function: Invite a member to an organization
CREATE OR REPLACE FUNCTION invite_member(
  p_email TEXT,
  p_role TEXT DEFAULT 'employee',
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_org_id UUID;
  target_org_id UUID;
  invitation_token TEXT;
  new_invitation_id UUID;
BEGIN
  -- Get caller's org
  SELECT org_id INTO caller_org_id
  FROM profiles WHERE id = auth.uid();

  -- Use provided org_id or caller's org
  target_org_id := COALESCE(p_org_id, caller_org_id);

  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = target_org_id)
  ) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions to invite members');
  END IF;

  -- Check if user already exists in this org
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email AND org_id = target_org_id
  ) THEN
    RETURN jsonb_build_object('error', 'User already exists in this organization');
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE email = p_email
    AND org_id = target_org_id
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object('error', 'A pending invitation already exists for this email');
  END IF;

  -- Generate invitation token
  invitation_token := encode(gen_random_bytes(32), 'hex');

  -- Create the invitation
  INSERT INTO invitations (org_id, email, role, invited_by, token)
  VALUES (target_org_id, p_email, p_role, auth.uid(), invitation_token)
  RETURNING id INTO new_invitation_id;

  RETURN jsonb_build_object(
    'id', new_invitation_id,
    'token', invitation_token,
    'email', p_email,
    'role', p_role,
    'org_id', target_org_id
  );
END;
$$;

-- Function: Accept an invitation
CREATE OR REPLACE FUNCTION accept_invite(
  p_token TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  target_org_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invitation');
  END IF;

  target_org_id := invitation_record.org_id;

  -- If user_id provided, link them to the org
  IF p_user_id IS NOT NULL THEN
    -- Update the user's profile
    UPDATE profiles
    SET org_id = target_org_id, role = invitation_record.role
    WHERE id = p_user_id;

    -- If no profile exists, create one
    IF NOT FOUND THEN
      INSERT INTO profiles (id, email, org_id, role, first_name, last_name)
      SELECT id, email, target_org_id, invitation_record.role, '', ''
      FROM auth.users WHERE id = p_user_id
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', target_org_id,
    'role', invitation_record.role,
    'email', invitation_record.email
  );
END;
$$;

-- Function: Get pending invitations for an organization
CREATE OR REPLACE FUNCTION get_pending_invitations(p_org_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  invited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_org_id UUID;
BEGIN
  -- Use provided org_id or caller's org
  target_org_id := COALESCE(p_org_id, (SELECT org_id FROM profiles WHERE id = auth.uid()));

  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = target_org_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    i.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown')::TEXT AS invited_by_name
  FROM invitations i
  LEFT JOIN profiles p ON p.id = i.invited_by
  WHERE i.org_id = target_org_id
  AND i.status = 'pending'
  AND i.expires_at > NOW()
  ORDER BY i.created_at DESC;
END;
$$;

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT EXECUTE ON FUNCTION invite_member(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invite(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_invitations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_admin(text, text, text, text, text, text) TO authenticated;
