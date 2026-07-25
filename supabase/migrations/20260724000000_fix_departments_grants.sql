/*
# Fix Departments Table API Access

## Summary
Fixes the "Could not find the table 'public.departments' in the schema cache"
error by ensuring the departments table is properly exposed to the Supabase
Data API (PostgREST).

## Problem
The departments table was created via SQL without proper API exposure.
PostgREST cannot see it in its schema cache, blocking all API calls.

## Fix (Run in order)

### Step 1: Drop the existing table (if it has no data to preserve)
DROP TABLE IF EXISTS departments;

### Step 2: Recreate via Supabase Dashboard UI
Go to Dashboard → Table Editor → New Table:
  - Name: departments
  - Enable RLS: Yes
  - Columns:
    - id (uuid, primary key, default: gen_random_uuid())
    - name (text, unique, not null)
    - created_at (timestamptz, default: now())

### Step 3: Run the SQL below to add RLS policies
*/

-- RLS policies for departments
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
