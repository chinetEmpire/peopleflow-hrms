
/*
# HR Management System - Core Schema

## Summary
Creates the complete database schema for the VCGL ONE HR Management System.

## New Tables

### 1. `profiles`
Extends Supabase auth.users with employee profile data.
- `id` - Links to auth.users
- `employee_id` - Human-readable employee identifier (e.g. VCGL/04-011)
- `first_name`, `last_name`, `nick_name` - Name fields
- `email` - Employee email
- `role` - One of: employee, manager, hr_admin, super_admin
- `department`, `job_title`, `phone` - Work info
- `avatar_url` - Profile photo
- `hire_date` - Employment start date
- `manager_id` - FK to profiles (their direct manager)
- `is_active` - Whether account is active

### 2. `attendance_records`
Tracks daily check-in/check-out times.
- `employee_id` - FK to profiles
- `check_in`, `check_out` - timestamps
- `date` - work date
- `status` - present, absent, late, half_day

### 3. `leave_types`
Configurable leave categories (Annual, Sick, etc.)
- `name`, `description`
- `days_allowed` - total days per year
- `is_active`

### 4. `leave_balances`
Per-employee leave balance per type per year.
- `employee_id`, `leave_type_id`, `year`
- `total_days`, `used_days`, `pending_days`

### 5. `leave_requests`
Employee leave applications.
- `employee_id`, `leave_type_id`
- `start_date`, `end_date`, `days_requested`
- `reason`, `status` (pending, approved, rejected)
- `approved_by`, `approved_at`

### 6. `audit_logs`
System audit trail for super admin monitoring.
- `actor_id` - who performed the action
- `action`, `entity`, `entity_id`
- `details` - JSONB with old/new values
- `ip_address`

## Security
- RLS enabled on all tables
- Authenticated users can access based on role
- Profiles viewable by authenticated users; editable by owner + hr_admin
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  nick_name text,
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr_admin', 'super_admin')),
  department text,
  job_title text,
  phone text,
  avatar_url text,
  hire_date date,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')
  )
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')
  )
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select" ON attendance_records;
CREATE POLICY "attendance_select" ON attendance_records FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('manager', 'hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance_records;
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin'))
);

DROP POLICY IF EXISTS "attendance_update" ON attendance_records;
CREATE POLICY "attendance_update" ON attendance_records FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin'))
)
WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin'))
);

DROP POLICY IF EXISTS "attendance_delete" ON attendance_records;
CREATE POLICY "attendance_delete" ON attendance_records FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'));

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  days_allowed integer NOT NULL DEFAULT 0,
  color text DEFAULT '#0e3a94',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin')
);

DROP POLICY IF EXISTS "leave_types_update" ON leave_types;
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'));

DROP POLICY IF EXISTS "leave_types_delete" ON leave_types;
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'));

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::integer,
  total_days integer NOT NULL DEFAULT 0,
  used_days integer NOT NULL DEFAULT 0,
  pending_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_balances_select" ON leave_balances;
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('manager', 'hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin')
);

DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'));

DROP POLICY IF EXISTS "leave_balances_delete" ON leave_balances;
CREATE POLICY "leave_balances_delete" ON leave_balances FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin'));

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_requested numeric NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
TO authenticated USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('manager', 'hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin'))
)
WITH CHECK (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin'))
);

DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE
TO authenticated
USING (
  (employee_id = auth.uid() AND status = 'pending')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr_admin')
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Seed default leave types
INSERT INTO leave_types (name, description, days_allowed, color) VALUES
  ('Annual Leave', 'Paid annual vacation leave', 20, '#0e3a94'),
  ('Sick Leave', 'Medical and health-related absence', 10, '#dc2626'),
  ('Emergency Leave', 'Urgent personal matters', 3, '#d97706'),
  ('Maternity Leave', 'Leave for new mothers', 90, '#7c3aed'),
  ('Paternity Leave', 'Leave for new fathers', 5, '#059669'),
  ('Unpaid Leave', 'Leave without pay', 30, '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
