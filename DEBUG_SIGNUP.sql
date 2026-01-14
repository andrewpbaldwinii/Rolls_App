-- ============================================
-- Debug Signup Issues
-- ============================================
-- Run this to check what's happening with signup
-- ============================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'users'
  OR (trigger_schema = 'auth' AND event_object_table = 'users');

-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Check recent users and profiles
SELECT 
  a.id,
  a.email,
  a.created_at as auth_created,
  u.id as profile_id,
  u.username,
  u.display_name,
  u.email as profile_email,
  u.created_at as profile_created,
  CASE 
    WHEN u.id IS NULL THEN '❌ No profile'
    WHEN u.username IS NULL THEN '⚠️ Profile exists but no username'
    WHEN u.display_name IS NULL THEN '⚠️ Profile exists but no display_name'
    WHEN u.username != u.display_name THEN '⚠️ Username and display_name do not match'
    ELSE '✅ Profile OK'
  END as status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
ORDER BY a.created_at DESC
LIMIT 10;

-- Check RLS policies
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
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ============================================
-- If you see issues:
-- 1. No trigger → Run CREATE_PROFILE_TRIGGER.sql
-- 2. No profile → Check if trigger is firing
-- 3. Username/display_name mismatch → Run FIX_USERS_TABLE.sql
-- ============================================

