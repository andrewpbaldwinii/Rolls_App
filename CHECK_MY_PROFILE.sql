-- ============================================
-- Check Your User Profile
-- ============================================
-- Run this to see your current profile information
-- ============================================

-- Show your auth account info
SELECT 
  'Auth Account' as type,
  id,
  email,
  created_at as account_created
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Show your profile info (if it exists)
-- Using COALESCE to handle missing columns gracefully
SELECT 
  'Profile' as type,
  id,
  COALESCE(
    (SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'),
    NULL
  ) as has_username_column,
  -- Try to select columns if they exist (will show NULL if column doesn't exist)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username')
    THEN (SELECT username FROM public.users WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))
    ELSE 'Column does not exist'
  END as username,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'display_name')
    THEN (SELECT display_name FROM public.users WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))
    ELSE 'Column does not exist'
  END as display_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name')
    THEN (SELECT name FROM public.users WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))
    ELSE 'Column does not exist'
  END as name
FROM public.users
LIMIT 1;

-- Simpler approach: Check what columns actually exist first
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Show combined view (auth + profile) - simplified
SELECT 
  a.id,
  a.email,
  CASE 
    WHEN u.id IS NULL THEN '❌ No profile created'
    ELSE '✅ Profile exists'
  END as profile_status,
  -- Only select columns that exist
  (SELECT string_agg(column_name, ', ') 
   FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'users') as available_columns
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
ORDER BY a.created_at DESC
LIMIT 5;

-- ============================================
-- If you see "NO USERNAME SET" or "User" as username,
-- that means the default was used. You can update it:
-- ============================================
-- UPDATE public.users 
-- SET username = 'your_username_here', display_name = 'Your Display Name'
-- WHERE id = 'YOUR_USER_ID_HERE';
-- ============================================

