-- ============================================================
-- FIX: Break RLS infinite recursion on profiles table
-- ============================================================
-- The profiles RLS policy queries profiles itself:
--   org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
-- This causes "infinite recursion detected in policy for relation profiles"
--
-- Fix: Create SECURITY DEFINER functions that bypass RLS,
-- then update all policies to use them instead.
-- ============================================================

-- 1. Helper: get current user's org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Helper: get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- 4. Helper: check if current user is hr_admin or super_admin
CREATE OR REPLACE FUNCTION public.is_hr_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr_admin', 'super_admin'));
$$;

-- ============================================================
-- 5. Rebuild RLS policies using the helper functions
-- ============================================================

-- ---- profiles ----
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
TO authenticated USING (
  id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = id
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.is_hr_or_super_admin()
)
WITH CHECK (
  auth.uid() = id
  OR public.is_hr_or_super_admin()
);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated
USING (
  public.is_hr_or_super_admin()
);

-- ---- organizations ----
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
TO authenticated USING (
  id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE
TO authenticated
USING (
  id = public.get_user_org_id()
  OR public.is_super_admin()
)
WITH CHECK (
  id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "org_delete" ON organizations;
CREATE POLICY "org_delete" ON organizations FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
);

-- ---- departments ----
DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "departments_insert" ON departments;
CREATE POLICY "departments_insert" ON departments FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "departments_update" ON departments;
CREATE POLICY "departments_update" ON departments FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "departments_delete" ON departments;
CREATE POLICY "departments_delete" ON departments FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- attendance_records ----
DROP POLICY IF EXISTS "attendance_select" ON attendance_records;
CREATE POLICY "attendance_select" ON attendance_records FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance_records;
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "attendance_update" ON attendance_records;
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "attendance_delete" ON attendance_records;
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- leave_types ----
DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_types_update" ON leave_types;
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_types_delete" ON leave_types;
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- leave_balances ----
DROP POLICY IF EXISTS "leave_balances_select" ON leave_balances;
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_balances_delete" ON leave_balances;
CREATE POLICY "leave_balances_delete" ON leave_balances FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- leave_requests ----
DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- audit_logs ----
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;
CREATE POLICY "audit_logs_update" ON audit_logs FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;
CREATE POLICY "audit_logs_delete" ON audit_logs FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- notifications ----
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
TO authenticated USING (
  user_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
TO authenticated USING (
  user_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  user_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
TO authenticated USING (
  user_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- invitations ----
DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select" ON invitations FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update" ON invitations FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- Note: plans, subscriptions, invoices tables don't exist in this DB — skipped

-- ---- work_schedules ----
DROP POLICY IF EXISTS "work_schedules_select" ON work_schedules;
CREATE POLICY "work_schedules_select" ON work_schedules FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "work_schedules_insert" ON work_schedules;
CREATE POLICY "work_schedules_insert" ON work_schedules FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "work_schedules_update" ON work_schedules;
CREATE POLICY "work_schedules_update" ON work_schedules FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "work_schedules_delete" ON work_schedules;
CREATE POLICY "work_schedules_delete" ON work_schedules FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- employee_compensation ----
DROP POLICY IF EXISTS "employee_compensation_select" ON employee_compensation;
CREATE POLICY "employee_compensation_select" ON employee_compensation FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "employee_compensation_insert" ON employee_compensation;
CREATE POLICY "employee_compensation_insert" ON employee_compensation FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "employee_compensation_update" ON employee_compensation;
CREATE POLICY "employee_compensation_update" ON employee_compensation FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "employee_compensation_delete" ON employee_compensation;
CREATE POLICY "employee_compensation_delete" ON employee_compensation FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- payroll_runs ----
DROP POLICY IF EXISTS "payroll_runs_select" ON payroll_runs;
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payroll_runs_insert" ON payroll_runs;
CREATE POLICY "payroll_runs_insert" ON payroll_runs FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payroll_runs_update" ON payroll_runs;
CREATE POLICY "payroll_runs_update" ON payroll_runs FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payroll_runs_delete" ON payroll_runs;
CREATE POLICY "payroll_runs_delete" ON payroll_runs FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- ---- payslips ----
DROP POLICY IF EXISTS "payslips_select" ON payslips;
CREATE POLICY "payslips_select" ON payslips FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payslips_insert" ON payslips;
CREATE POLICY "payslips_insert" ON payslips FOR INSERT
TO authenticated WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payslips_update" ON payslips;
CREATE POLICY "payslips_update" ON payslips FOR UPDATE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
) WITH CHECK (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "payslips_delete" ON payslips;
CREATE POLICY "payslips_delete" ON payslips FOR DELETE
TO authenticated USING (
  org_id = public.get_user_org_id()
  OR public.is_super_admin()
);

-- Grant execute on helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_or_super_admin() TO authenticated;
