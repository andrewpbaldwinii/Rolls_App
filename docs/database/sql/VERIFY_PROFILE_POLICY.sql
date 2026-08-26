-- ============================================
-- Verify Profile Image Upload Policy
-- ============================================
-- Run this in Supabase SQL Editor to check if the policy is set correctly
-- ============================================

-- Check if policies exist for profile uploads
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
  AND (
    policyname LIKE '%upload%' OR
    policyname LIKE '%profile%' OR
    with_check::text LIKE '%profiles%'
  )
ORDER BY policyname;

-- ============================================
-- Expected Result:
-- ============================================
-- You should see at least one policy with:
--   • cmd = 'INSERT'
--   • with_check containing 'profiles' AND auth.uid()
-- ============================================

-- ============================================
-- If no results, the policy needs to be created
-- ============================================
-- Follow the instructions in STORAGE_PROFILE_POLICY_DASHBOARD.md
-- ============================================

