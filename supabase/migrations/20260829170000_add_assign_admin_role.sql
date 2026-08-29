-- ============================================================
-- Phase 13.1: Secure in-app admin role assignment
-- Adds assign_admin_role(): a service-role-only SECURITY DEFINER
-- RPC that lets an authenticated super_admin grant/change platform
-- roles through the UI, while keeping prevent_role_escalation()
-- as the single enforcement point.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Make the escalation trigger caller-aware.
--    auth.uid() is NULL under the service-role key, so direct
--    service-role writes can never escalate roles (unchanged).
--    A trusted RPC signals the real caller via the transaction-local
--    "app.caller_id" variable; the trigger then enforces the same
--    role rules against that caller.
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_id UUID;
BEGIN
  -- If role column is not being changed, allow
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Resolve the caller: prefer the authenticated session (auth.uid());
  -- fall back to the transaction-local variable set only by trusted RPCs.
  caller_id := COALESCE(
    auth.uid(),
    NULLIF(current_setting('app.caller_id', true), '')::UUID
  );

  IF caller_id IS NOT NULL THEN
    SELECT p.role INTO caller_role
    FROM public.profiles p
    WHERE p.id = caller_id;
  END IF;

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

CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- ─────────────────────────────────────────────
-- 2. assign_admin_role — secure role assignment RPC.
--    Executable only by the service-role key (the app's admin APIs).
--    Verifies the caller is a current super_admin, never allows one
--    platform admin to modify another, and records an audit event.
--    Granting super_admin detaches the target from any org (org_id=NULL).
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_admin_role(
  caller_id UUID,
  target_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  target_email TEXT;
  target_org_id UUID;
  target_current_role TEXT;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Missing caller_id';
  END IF;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Missing target_id';
  END IF;

  IF new_role IS NULL OR new_role NOT IN ('employee', 'manager', 'hr_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid target role';
  END IF;

  SELECT p.role INTO caller_role
  FROM public.profiles p
  WHERE p.id = caller_id;

  IF caller_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can assign platform roles';
  END IF;

  SELECT p.email, p.org_id, p.role
    INTO target_email, target_org_id, target_current_role
  FROM public.profiles p
  WHERE p.id = target_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- One platform admin cannot modify another (mirrors reset-password guard).
  IF target_current_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot modify another platform admin';
  END IF;

  -- Signal the real caller to the escalation trigger for this transaction.
  PERFORM set_config('app.caller_id', caller_id::TEXT, true);

  UPDATE public.profiles
  SET role = new_role,
      org_id = CASE WHEN new_role = 'super_admin' THEN NULL ELSE org_id END,
      updated_at = now()
  WHERE id = target_id;

  INSERT INTO public.audit_logs (actor_id, org_id, action, entity, entity_id, details)
  VALUES (
    caller_id,
    target_org_id,
    'update',
    'user',
    target_id,
    jsonb_build_object(
      'role', new_role,
      'via', 'assign_admin_role',
      'target_email', target_email
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_id', target_id,
    'role', new_role
  );
END;
$$;

-- Only the service role (app admin APIs) may execute this function.
REVOKE ALL ON FUNCTION public.assign_admin_role(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_admin_role(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.assign_admin_role(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(UUID, UUID, TEXT) TO service_role;