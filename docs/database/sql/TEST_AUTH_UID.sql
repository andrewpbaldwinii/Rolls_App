-- Test what auth.uid() actually returns
-- Run this in Supabase SQL Editor while logged in

SELECT 
  auth.uid() as auth_uid,
  auth.uid()::text as auth_uid_text,
  'YOUR_USER_UUID' as your_user_id,
  auth.uid()::text = 'YOUR_USER_UUID' as ids_match,
  -- Test the full path
  'profiles/YOUR_USER_UUID/test.jpg' as test_path,
  (string_to_array('profiles/YOUR_USER_UUID/test.jpg', '/'))[1] as first_seg,
  (string_to_array('profiles/YOUR_USER_UUID/test.jpg', '/'))[2] as second_seg,
  (string_to_array('profiles/YOUR_USER_UUID/test.jpg', '/'))[2] = auth.uid()::text as second_seg_matches_auth_uid;

