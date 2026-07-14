-- Add JSONB columns for structured employee profile data
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_experience  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dependents       jsonb NOT NULL DEFAULT '[]'::jsonb;
