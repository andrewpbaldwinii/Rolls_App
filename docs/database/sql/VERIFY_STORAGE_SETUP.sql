-- ============================================
-- VERIFY STORAGE SETUP FOR PHOTO UPLOADS
-- ============================================
-- Run this to check if storage is set up correctly
-- ============================================

-- Check if roll-images bucket exists
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'roll-images';

-- Check storage policies for roll-images bucket
-- Note: Storage policies in Supabase are RLS policies on storage.objects
-- They're managed through the Supabase Dashboard or via SQL functions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Check if roll_images table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'roll_images'
ORDER BY ordinal_position;

-- Check RLS policies on roll_images table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'roll_images'
  AND schemaname = 'public'
ORDER BY policyname;

-- Test: Check if you can see any existing images
SELECT 
  id,
  roll_id,
  image_url,
  contributor_id,
  caption,
  created_at
FROM roll_images
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- 1. Bucket 'roll-images' should exist
-- 2. Should have 3 policies: INSERT, SELECT, DELETE
-- 3. roll_images table should have columns: id, roll_id, image_url, contributor_id, caption, created_at
-- 4. Should have RLS policies for viewing and inserting images
-- ============================================

