-- Fix Storage Policies for PIN Auth System
-- The previous policies required 'authenticated' (Supabase Auth) users.
-- Since the app uses custom PIN login (client-side state), users are technically 'anonymous' to Supabase.
-- correctly, we need to allow 'public' access for the patient-images bucket.

-- 1. Drop the restrictive policies (if they exist by name)
-- Note: We use DO blocks or simply try to drop to avoid errors if names differ, 
-- but straightforward DROP IF EXISTS is usually fine if we know the names.
-- Based on: migrations/archive/add_patient_images.sql

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 2. Create new permissive policies for patient-images bucket
-- These allow ANONYMOUS (public) users to upload/read/delete if the bucket matches.

-- Uploads
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'patient-images');

-- Reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'patient-images');

-- Deletes
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'patient-images');

-- Update: Ensure the bucket exists and is public (optional, but good for reading)
UPDATE storage.buckets
SET public = true
WHERE id = 'patient-images';
