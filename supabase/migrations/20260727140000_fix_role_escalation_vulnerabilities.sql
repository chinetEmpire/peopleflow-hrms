-- ============================================================
-- FIX: Role escalation vulnerabilities (CRITICAL)
-- ============================================================

-- 1. Fix handle_new_user() trigger — whitelist roles, never allow super_admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role TEXT;
  safe_role TEXT;
BEGIN
  requested_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'employee')));

  -- Whitelist: only allow employee, manager, hr_admin
  -- super_admin must NEVER be set via user metadata
  IF requested_role IN ('employee', 'manager', 'hr_admin') THEN
    safe_role := requested_role;
  ELSE
    safe_role := 'employee';
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    safe_role,
    (NEW.raw_user_meta_data->>'org_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Prevent role escalation via direct profile updates (RLS bypass protection)
-- This trigger runs on every UPDATE to profiles and blocks non-super_admin
-- users from promoting themselves or others to super_admin.
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If role column is not being changed, allow
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Look up the caller's current role from auth context
  SELECT p.role INTO caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  -- Only super_admin can assign super_admin
  IF NEW.role = 'super_admin' AND caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can assign the super_admin role';
  END IF;

  -- Only super_admin or hr_admin can assign hr_admin
  IF NEW.role = 'hr_admin' AND caller_role NOT IN ('super_admin', 'hr_admin') THEN
    RAISE EXCEPTION 'Only super_admin or hr_admin can assign the hr_admin role';
  END IF;

  -- Prevent employees from changing their own role entirely
  IF caller_role = 'employee' AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Employees cannot change their own role';
  END IF;

  -- Prevent managers from assigning admin roles
  IF caller_role = 'manager' AND NEW.role IN ('hr_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Managers cannot assign admin roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- 3. Fix create_organization_with_admin — use hr_admin instead of super_admin
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
    UPDATE profiles SET org_id = new_org_id, role = 'hr_admin'
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
