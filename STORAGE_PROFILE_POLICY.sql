-- ============================================
-- Storage Policy for Profile Images
-- ============================================
-- IMPORTANT: Storage policies must be created via Supabase Dashboard
-- This file provides the policy definitions to copy into the dashboard
-- ============================================

-- ============================================
-- OPTION 1: Update Existing Policy (Recommended)
-- ============================================
-- Go to Supabase Dashboard → Storage → roll-images bucket → Policies
-- Find the "Authenticated users can upload images" policy
-- Update the WITH CHECK clause to also allow profile uploads:
-- ============================================

-- Updated WITH CHECK clause (replace the existing one):
/*
WITH CHECK (
  bucket_id = 'roll-images' AND
  (
    -- Allow roll uploads (existing functionality)
    (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM rolls WHERE creator_id = auth.uid()
      UNION
      SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
    )
    OR
    -- Allow profile uploads (new functionality)
    (
      (string_to_array(name, '/'))[1] = 'profiles' AND
      (string_to_array(name, '/'))[2] = auth.uid()::text
    )
  )
);
*/

-- ============================================
-- OPTION 2: Create New Policy via Dashboard
-- ============================================
-- If you prefer separate policies, create a new policy in the dashboard:
-- ============================================

-- Policy Name: "Users can upload profile images"
-- Operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
/*
bucket_id = 'roll-images' AND
(string_to_array(name, '/'))[1] = 'profiles' AND
(string_to_array(name, '/'))[2] = auth.uid()::text
*/

-- ============================================
-- STEP-BY-STEP INSTRUCTIONS:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Click "Storage" in the left sidebar
-- 3. Click on the "roll-images" bucket
-- 4. Click the "Policies" tab
-- 5. Find "Authenticated users can upload images" policy
-- 6. Click "Edit" (or the pencil icon)
-- 7. Replace the WITH CHECK clause with the updated one above (Option 1)
-- 8. Click "Save"
-- ============================================

-- ============================================
-- VERIFY IT WORKED:
-- ============================================
-- After updating, you should be able to upload profile images
-- The policy will now allow both:
--   • Roll images: {rollId}/filename.jpg
--   • Profile images: profiles/{userId}/filename.jpg
-- ============================================
