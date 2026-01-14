-- ============================================
-- Fix Orphaned Users Issue
-- ============================================
-- Run this BEFORE running COMPLETE_DATABASE_SETUP_SAFE.sql
-- This removes any user profiles that don't have matching auth.users entries
-- ============================================

-- Check what orphaned users exist
SELECT 
  u.id, 
  u.username, 
  u.display_name,
  'Orphaned - will be deleted' as status
FROM public.users u
WHERE u.id NOT IN (SELECT id FROM auth.users);

-- Delete orphaned user profiles (users that don't exist in auth.users)
-- This is safe - these profiles are invalid anyway
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Verify cleanup
SELECT 
  COUNT(*) as remaining_users,
  'All users now have matching auth.users entries' as status
FROM public.users u
WHERE u.id IN (SELECT id FROM auth.users);

-- ============================================
-- ✅ Now you can run COMPLETE_DATABASE_SETUP_SAFE.sql
-- ============================================

