-- ============================================================
-- FIX: handle_new_user trigger — safely handle missing org_id
-- FIX: Edge Function audit — add org_id to audit logs
-- ============================================================

-- 1. Fix handle_new_user() — skip profile insert if org_id is missing
--    instead of failing with NOT NULL constraint violation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role TEXT;
  safe_role TEXT;
  org_id_val UUID;
BEGIN
  requested_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'employee')));

  IF requested_role IN ('employee', 'manager', 'hr_admin') THEN
    safe_role := requested_role;
  ELSE
    safe_role := 'employee';
  END IF;

  -- Safely parse org_id; skip profile creation if missing
  BEGIN
    org_id_val := (NEW.raw_user_meta_data->>'org_id')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE WARNING 'handle_new_user: invalid org_id in metadata for user %, skipping profile creation', NEW.id;
    RETURN NEW;
  END;

  IF org_id_val IS NULL THEN
    RAISE WARNING 'handle_new_user: missing org_id in metadata for user %, skipping profile creation', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    safe_role,
    org_id_val
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
