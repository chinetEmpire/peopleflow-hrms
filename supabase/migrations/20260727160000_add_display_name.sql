-- Migration: Add display_name column to organizations for branding
-- Run this ENTIRE block as ONE statement in the Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Step 2: Drop + recreate function atomically via dynamic SQL
DO $$
BEGIN
  DROP FUNCTION IF EXISTS get_current_organization() CASCADE;

  EXECUTE '
    CREATE FUNCTION get_current_organization()
    RETURNS TABLE(
      id uuid,
      name text,
      slug text,
      display_name text,
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
      SELECT o.id, o.name, o.slug, o.display_name, o.logo_url, o.primary_color, o.plan, o.max_employees
      FROM organizations o
      INNER JOIN profiles p ON p.org_id = o.id
      WHERE p.id = auth.uid();
    END;
    $$';
END $$;

GRANT EXECUTE ON FUNCTION get_current_organization() TO authenticated;
