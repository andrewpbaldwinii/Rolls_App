-- Test what auth.uid() actually returns
-- Run this in Supabase SQL Editor while logged in

SELECT 
  auth.uid() as auth_uid,
  auth.uid()::text as auth_uid_text,
  '2cff8f11-16a5-4815-a305-d2fcb69aae7d' as your_user_id,
  auth.uid()::text = '2cff8f11-16a5-4815-a305-d2fcb69aae7d' as ids_match,
  -- Test the full path
  'profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg' as test_path,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[1] as first_seg,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[2] as second_seg,
  (string_to_array('profiles/2cff8f11-16a5-4815-a305-d2fcb69aae7d/test.jpg', '/'))[2] = auth.uid()::text as second_seg_matches_auth_uid;

