-- ============================================
-- CHECK STORAGE BUCKET SETUP
-- ============================================
-- Simplified check for storage bucket
-- ============================================

-- Check if roll-images bucket exists
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'roll-images';

-- ============================================
-- If the bucket doesn't exist, create it:
-- ============================================
-- Go to Supabase Dashboard → Storage → New Bucket
-- Name: roll-images
-- Make it Public (toggle ON)
-- ============================================

-- Check RLS on storage.objects (this is where storage policies apply)
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- Expected Results:
-- ============================================
-- 1. Bucket 'roll-images' should exist and be public
-- 2. Should have policies on storage.objects for:
--    - INSERT (upload)
--    - SELECT (view)
--    - DELETE (remove)
-- ============================================

