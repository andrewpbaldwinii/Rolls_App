-- Test if the policy logic works with your actual user ID
-- Run this in Supabase SQL Editor while logged in as your user

-- This will show if the path segments match what the policy expects
SELECT 
  auth.uid() as current_user_id,
  'profiles/' || auth.uid()::text || '/test.jpg' as test_path,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[1] as first_segment,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[2] as second_segment,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[1] = 'profiles' as first_check,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[2] = auth.uid()::text as second_check,
  -- This should be TRUE if the policy would allow it
  (
    (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[1] = 'profiles' AND
    (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[2] = auth.uid()::text
  ) as profile_check_passes;

