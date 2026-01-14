-- Verify that the profile upload policy exists
-- Run this in Supabase SQL Editor

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
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- This will show ALL INSERT policies on storage.objects
-- Look for policies that mention "profile" or check for "profiles" in the path

