-- Run this FIRST in Supabase SQL Editor to see what succeeded/failed
-- from the previous attempt

-- Check if organizations table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations'
) AS organizations_table_exists;

-- Check which tables have org_id column
SELECT table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE column_name = 'org_id' AND table_name = t.table_name
  ) AS has_org_id
FROM (VALUES
  ('profiles'),
  ('departments'),
  ('leave_types'),
  ('leave_balances'),
  ('leave_requests'),
  ('attendance_records'),
  ('audit_logs'),
  ('notifications')
) AS t(table_name);

-- Check if default org exists
SELECT EXISTS (
  SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'
) AS default_org_exists;
