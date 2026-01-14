-- ============================================
-- Check Your User Profile (Simple Version)
-- ============================================
-- This version works even if columns are missing
-- ============================================

-- Step 1: Check what columns exist in public.users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Show all data in public.users (whatever columns exist)
SELECT * FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Show auth.users info
SELECT 
  id,
  email,
  created_at as account_created
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check if profiles exist for auth users
SELECT 
  a.id,
  a.email,
  CASE 
    WHEN u.id IS NULL THEN '❌ No profile'
    ELSE '✅ Has profile'
  END as profile_status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
ORDER BY a.created_at DESC;

-- ============================================
-- If you see columns missing (like display_name, username),
-- you need to run FIX_USERS_TABLE.sql or 
-- COMPLETE_DATABASE_SETUP_SAFE.sql to add them.
-- ============================================

