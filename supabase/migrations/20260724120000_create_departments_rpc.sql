/*
# Create Departments RPC Functions

## Summary
Bypasses PostgREST schema cache issue by providing RPC functions
for departments CRUD operations.

## Why
The departments table was created via SQL migration and PostgREST
cannot see it in its schema cache. These functions allow the
frontend to query departments via supabase.rpc() instead of
supabase.from('departments'), which bypasses the PostgREST
exposure issue.

## Security
- get_departments: Accessible to all authenticated users
- create_department: Only accessible to hr_admin and super_admin roles
*/

-- Function to get all departments
CREATE OR REPLACE FUNCTION get_departments()
RETURNS TABLE(name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT d.name::text FROM departments d ORDER BY d.name;
END;
$$;

-- Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION get_departments() TO authenticated;

-- Function to create a new department
CREATE OR REPLACE FUNCTION create_department(dept_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_name text;
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('hr_admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create departments';
  END IF;

  -- Insert the new department
  INSERT INTO departments (name) VALUES (dept_name) ON CONFLICT (name) DO NOTHING;
  
  -- Return the name (either newly created or existing)
  SELECT d.name INTO new_name FROM departments d WHERE d.name = dept_name;
  
  RETURN new_name;
END;
$$;

-- Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION create_department(text) TO authenticated;