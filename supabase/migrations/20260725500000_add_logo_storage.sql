/*
  Phase 5: Custom Branding - Storage Bucket for Logos
  
  Summary:
  - Creates Supabase Storage bucket for organization logos
  - Sets up RLS policies for logo access
*/

-- ============================================================
-- 1. CREATE STORAGE BUCKET FOR LOGOS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE POLICIES
-- ============================================================

-- Anyone can view logos (public bucket)
DROP POLICY IF EXISTS "Public read access for org logos" ON storage.objects;
CREATE POLICY "Public read access for org logos" ON storage.objects
FOR SELECT
USING (bucket_id = 'org-logos');

-- Authenticated users can upload logos for their org
DROP POLICY IF EXISTS "Authenticated users can upload org logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload org logos" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'org-logos'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can update their org logos
DROP POLICY IF EXISTS "Authenticated users can update org logos" ON storage.objects;
CREATE POLICY "Authenticated users can update org logos" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'org-logos'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can delete their org logos
DROP POLICY IF EXISTS "Authenticated users can delete org logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete org logos" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'org-logos'
  AND auth.role() = 'authenticated'
);
