-- Fix RLS policies for leave_balances, leave_types, and leave_requests
-- to allow super_admin alongside hr_admin for write operations
-- This fixes the "Failed to save leave balances" error for super_admin users

-- ============================================
-- 1. LEAVE TYPES - Add super_admin to write policies
-- ============================================
DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "leave_types_update" ON leave_types;
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

DROP POLICY IF EXISTS "leave_types_delete" ON leave_types;
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

-- ============================================
-- 2. LEAVE BALANCES - Add super_admin to write policies
-- ============================================
DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

DROP POLICY IF EXISTS "leave_balances_delete" ON leave_balances;
CREATE POLICY "leave_balances_delete" ON leave_balances FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

-- ============================================
-- 3. LEAVE REQUESTS - Add super_admin to write policies
-- ============================================
DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
)
WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE
TO authenticated
USING (
  (employee_id = auth.uid() AND status = 'pending')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
);
