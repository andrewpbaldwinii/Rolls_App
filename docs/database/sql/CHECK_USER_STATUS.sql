-- ============================================
-- Check User Status
-- ============================================
-- Run this to see what users exist and their status
-- ============================================

-- Check what users exist in auth.users (your authenticated users)
SELECT 
  id,
  email,
  created_at as auth_created_at,
  'Has auth account' as status
FROM auth.users
ORDER BY created_at DESC;

-- Check what profiles exist in public.users
-- Only select columns that exist (table might be missing some columns)
SELECT 
  id,
  COALESCE(username::text, 'No username') as username,
  COALESCE(display_name::text, 'No display name') as display_name,
  COALESCE(created_at::text, 'No created_at') as profile_created_at,
  'Has profile' as status
FROM public.users
ORDER BY id;

-- Check for orphaned profiles (profiles without auth.users)
-- Only select columns that exist
SELECT 
  u.id,
  COALESCE(u.username::text, 'No username') as username,
  'ORPHANED - No auth account' as status,
  'This profile will be deleted' as warning
FROM public.users u
WHERE u.id NOT IN (SELECT id FROM auth.users);

-- Check for users without profiles (auth.users without public.users)
SELECT 
  a.id,
  a.email,
  'Has auth but NO profile' as status,
  'Profile will be created automatically' as note
FROM auth.users a
WHERE a.id NOT IN (SELECT id FROM public.users);

-- ============================================
-- Summary
-- ============================================
-- If you see your email in the "Has auth but NO profile" section,
-- that's your current account and it's fine - the script will create a profile.
-- 
-- If you see an ID in "ORPHANED" section, that's the problematic one
-- and it's safe to delete (it can't be used anyway).
-- ============================================

