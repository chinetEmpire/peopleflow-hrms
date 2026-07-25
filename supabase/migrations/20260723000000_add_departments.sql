/*
# Add Departments

## Summary
Creates a `departments` table for managing organizational departments
and adds a `department` column to `profiles` to track which department
an employee belongs to.

## New Tables

### 1. `departments`
- `id` - uuid primary key
- `name` - unique department name
- `created_at` - timestamp

## Modified Tables

### `profiles`
New columns:
- `department` (text) — name of the department the employee belongs to

## Security
- RLS enabled on departments
- All authenticated users can read departments
- Only HR admins and super admins can create/update/delete departments
*/

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Expose departments table to the Supabase Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO authenticated;

DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_insert" ON departments;
CREATE POLICY "departments_insert" ON departments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin'))
);

DROP POLICY IF EXISTS "departments_update" ON departments;
CREATE POLICY "departments_update" ON departments FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

DROP POLICY IF EXISTS "departments_delete" ON departments;
CREATE POLICY "departments_delete" ON departments FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('hr_admin', 'super_admin')));

-- Add department column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department text DEFAULT NULL;

-- Index for department lookups
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
