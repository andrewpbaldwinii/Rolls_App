-- ============================================
-- TEST TRIGGER FUNCTION
-- ============================================
-- Run this to test if the trigger function works
-- ============================================

-- Test 1: Check if function exists and is valid
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- Test 2: Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Test 3: Check users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Test 4: Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- Test 5: Try to manually call the function (will fail but shows syntax errors)
-- Uncomment to test:
-- SELECT public.handle_new_user();

-- ============================================
-- If all checks pass, the trigger should work
-- ============================================
