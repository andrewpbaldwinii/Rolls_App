-- Test the policy logic with your actual user ID
-- Run this in Supabase SQL Editor (make sure you're logged in as the user)

-- First, check what auth.uid() returns
SELECT auth.uid() as current_user_id;

-- Then test if the policy condition would pass
SELECT 
  'profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg' as test_path,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[1] as first_seg,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[2] as second_seg,
  auth.uid()::text as auth_uid_text,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[1] = 'profiles' as check1,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[2] = auth.uid()::text as check2,
  -- Full condition
  (
    (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[1] = 'profiles' AND
    (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[2] = auth.uid()::text
  ) as full_check_passes;

