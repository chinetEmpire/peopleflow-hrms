-- Migration: Tighten RLS policies for org-level data isolation
-- Fixes: profiles UPDATE/DELETE, leave_requests INSERT, employee delete safety

-- ─── Profiles: org-scoped UPDATE ────────────────────────────────────────────
-- Allow hr_admin/super_admin to update profiles only within their own org
-- (self-update always allowed)

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR (
    public.is_hr_or_super_admin()
    AND org_id = public.get_user_org_id()
  )
)
WITH CHECK (
  auth.uid() = id
  OR (
    public.is_hr_or_super_admin()
    AND org_id = public.get_user_org_id()
  )
);

-- ─── Profiles: org-scoped DELETE ────────────────────────────────────────────
-- Only super_admin within the same org can delete profiles

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  AND org_id = public.get_user_org_id()
);

-- ─── Leave requests: enforce org_id on employee self-insert ─────────────────
-- When employee inserts their own request, org_id must match their org

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (
  (employee_id = auth.uid() AND org_id = public.get_user_org_id())
  OR (org_id = public.get_user_org_id() AND public.is_hr_or_super_admin())
  OR public.is_super_admin()
);

-- ─── Attendance records: enforce org_id on employee self-insert ─────────────

DROP POLICY IF EXISTS "attendance_insert" ON attendance_records;
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (
  (employee_id = auth.uid() AND org_id = public.get_user_org_id())
  OR (org_id = public.get_user_org_id() AND public.is_hr_or_super_admin())
  OR public.is_super_admin()
);

-- ─── Leave balances: enforce org_id on employee self-insert ─────────────────

DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (
  (employee_id = auth.uid() AND org_id = public.get_user_org_id())
  OR (org_id = public.get_user_org_id() AND public.is_hr_or_super_admin())
  OR public.is_super_admin()
);
