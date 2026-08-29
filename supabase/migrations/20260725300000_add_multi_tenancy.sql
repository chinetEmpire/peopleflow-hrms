/*
# Multi-Tenancy Support

## Summary
Adds organization-based multi-tenancy to the HR Management System.
Each organization gets its own isolated portal with custom branding.

## Migration Order
1. Create organizations table (no RLS yet)
2. Add org_id columns to ALL tables
3. Create default org + populate existing data
4. Make org_id NOT NULL
5. Add unique constraints
6. NOW create all RLS policies (org_id exists on all tables)
7. Update database functions
8. Add indexes
9. Grant permissions
*/

-- ============================================================
-- 1. CREATE ORGANIZATIONS TABLE (no RLS yet)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  max_employees INT DEFAULT 10,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ADD org_id COLUMNS (initially nullable, no FK yet)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS org_id UUID;

-- ============================================================
-- 3. CREATE DEFAULT ORGANIZATION FOR EXISTING DATA
-- ============================================================

INSERT INTO organizations (id, name, slug, display_name, plan, max_employees)
VALUES ('00000000-0000-0000-0000-000000000001', 'flowHR', 'flowhr', 'flowHR', 'pro', 50)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. POPULATE org_id ON EXISTING ROWS
-- ============================================================

UPDATE profiles SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE departments SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE leave_types SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE leave_balances SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE leave_requests SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE attendance_records SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE audit_logs SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE notifications SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- ============================================================
-- 5. MAKE org_id NOT NULL
-- ============================================================

ALTER TABLE profiles ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE departments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE leave_types ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE leave_balances ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN org_id SET NOT NULL;

-- ============================================================
-- 6. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_org_id_fk') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_org_id_fk') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_types_org_id_fk') THEN
    ALTER TABLE leave_types ADD CONSTRAINT leave_types_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_org_id_fk') THEN
    ALTER TABLE leave_balances ADD CONSTRAINT leave_balances_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_org_id_fk') THEN
    ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_org_id_fk') THEN
    ALTER TABLE attendance_records ADD CONSTRAINT attendance_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_org_id_fk') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_org_id_fk') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 7. UPDATE UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE departments ADD CONSTRAINT departments_org_id_name_unique UNIQUE (org_id, name);

ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_name_key;
ALTER TABLE leave_types ADD CONSTRAINT leave_types_org_id_name_unique UNIQUE (org_id, name);

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_employee_id_date_key;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_org_employee_date_unique UNIQUE (org_id, employee_id, date);

ALTER TABLE leave_balances DROP CONSTRAINT IF EXISTS leave_balances_employee_id_leave_type_id_year_key;
ALTER TABLE leave_balances ADD CONSTRAINT leave_balances_org_emp_type_year_unique UNIQUE (org_id, employee_id, leave_type_id, year);

-- ============================================================
-- 8. ENABLE RLS ON ORGANIZATIONS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS POLICIES — ORGANIZATIONS
-- ============================================================

DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
TO authenticated USING (
  id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE
TO authenticated
USING (
  id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
  id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "org_delete" ON organizations;
CREATE POLICY "org_delete" ON organizations FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ============================================================
-- 10. RLS POLICIES — PROFILES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
TO authenticated USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = profiles.org_id)
  )
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = profiles.org_id)
  )
);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = profiles.org_id)
  )
);

-- ============================================================
-- 11. RLS POLICIES — DEPARTMENTS
-- ============================================================

DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT
TO authenticated USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "departments_insert" ON departments;
CREATE POLICY "departments_insert" ON departments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = departments.org_id)
  )
);

DROP POLICY IF EXISTS "departments_update" ON departments;
CREATE POLICY "departments_update" ON departments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = departments.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = departments.org_id)
  )
);

DROP POLICY IF EXISTS "departments_delete" ON departments;
CREATE POLICY "departments_delete" ON departments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = departments.org_id)
  )
);

-- ============================================================
-- 12. RLS POLICIES — LEAVE TYPES
-- ============================================================

DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT
TO authenticated USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_types.org_id)
  )
);

DROP POLICY IF EXISTS "leave_types_update" ON leave_types;
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_types.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_types.org_id)
  )
);

DROP POLICY IF EXISTS "leave_types_delete" ON leave_types;
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_types.org_id)
  )
);

-- ============================================================
-- 13. RLS POLICIES — LEAVE BALANCES
-- ============================================================

DROP POLICY IF EXISTS "leave_balances_select" ON leave_balances;
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_balances.org_id)
  )
);

DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_balances.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_balances.org_id)
  )
);

DROP POLICY IF EXISTS "leave_balances_delete" ON leave_balances;
CREATE POLICY "leave_balances_delete" ON leave_balances FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_balances.org_id)
  )
);

-- ============================================================
-- 14. RLS POLICIES — LEAVE REQUESTS
-- ============================================================

DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (
  employee_id = auth.uid()
  AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_requests.org_id)
  )
)
WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_requests.org_id)
  )
);

DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE
TO authenticated
USING (
  (employee_id = auth.uid() AND status = 'pending')
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = leave_requests.org_id)
  )
);

-- ============================================================
-- 15. RLS POLICIES — ATTENDANCE RECORDS
-- ============================================================

DROP POLICY IF EXISTS "attendance_select" ON attendance_records;
CREATE POLICY "attendance_select" ON attendance_records FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance_records;
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (
  (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = attendance_records.org_id)
  ))
  AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "attendance_update" ON attendance_records;
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = attendance_records.org_id)
  )
)
WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = attendance_records.org_id)
  )
);

DROP POLICY IF EXISTS "attendance_delete" ON attendance_records;
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = attendance_records.org_id)
  )
);

-- ============================================================
-- 16. RLS POLICIES — AUDIT LOGS
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'super_admin'
  )
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr_admin')
    AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;
CREATE POLICY "audit_logs_update" ON audit_logs FOR UPDATE
TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;
CREATE POLICY "audit_logs_delete" ON audit_logs FOR DELETE
TO authenticated USING (false);

-- ============================================================
-- 17. RLS POLICIES — NOTIFICATIONS
-- ============================================================

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "Service role inserts notifications" ON notifications;
CREATE POLICY "Service role inserts notifications" ON notifications FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;
CREATE POLICY "Users delete own notifications" ON notifications FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ============================================================
-- 18. UPDATE DATABASE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    (NEW.raw_user_meta_data->>'org_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_department(dept_name text, p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('hr_admin', 'super_admin')
    AND (p.role = 'super_admin' OR p.org_id = p_org_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create departments';
  END IF;

  INSERT INTO departments (name, org_id)
  VALUES (dept_name, p_org_id)
  ON CONFLICT (org_id, name) DO NOTHING;

  SELECT d.name INTO new_name FROM departments d WHERE d.name = dept_name AND d.org_id = p_org_id;

  RETURN new_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_departments()
RETURNS TABLE(name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT d.name::text
  FROM departments d
  WHERE d.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ORDER BY d.name;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_organization()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  primary_color text,
  plan text,
  max_employees int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.logo_url, o.primary_color, o.plan, o.max_employees
  FROM organizations o
  INNER JOIN profiles p ON p.org_id = o.id
  WHERE p.id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    PERFORM create_notification(
      NEW.employee_id,
      'Leave Approved',
      'Your ' || (SELECT name FROM leave_types WHERE id = NEW.leave_type_id) || ' request has been approved.',
      'leave_approved',
      jsonb_build_object('leave_request_id', NEW.id)
    );
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    PERFORM create_notification(
      NEW.employee_id,
      'Leave Rejected',
      'Your ' || (SELECT name FROM leave_types WHERE id = NEW.leave_type_id) || ' request has been rejected.',
      'leave_rejected',
      jsonb_build_object('leave_request_id', NEW.id, 'reason', NEW.rejection_reason)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 19. ADD INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_org_id ON leave_types(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_org_id ON leave_balances(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_id ON leave_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance_records(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(org_id);

CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON profiles(org_id, role);
CREATE INDEX IF NOT EXISTS idx_departments_org_name ON departments(org_id, name);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status ON leave_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON attendance_records(org_id, date);

-- ============================================================
-- 20. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION create_department(text, uuid) TO authenticated;
