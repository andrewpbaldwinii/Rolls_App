-- ============================================
-- Storage Policies for roll-images Bucket (PRIVATE)
-- ============================================
-- IMPORTANT: This bucket should be PRIVATE (not public)
-- Roll images are conditionally accessible based on release_date
-- Use signed URLs for access control
-- ============================================
-- 
-- STEP 1: Make sure roll-images bucket is PRIVATE
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click on "roll-images" bucket
-- 3. Make sure "Public bucket" is OFF (unchecked)
-- 4. This ensures images are only accessible via signed URLs
-- ============================================

-- Allow authenticated users to upload images to any roll they have access to
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'roll-images' AND
  -- Extract roll_id from path (format: roll_id/filename.jpg)
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    UNION
    SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
  )
);

-- Allow users to view images if they have access to the roll
-- This is for signed URL generation - the bucket itself is private
-- Access is controlled by:
-- 1. User owns the roll OR
-- 2. User is a contributor OR
-- 3. Roll's release_date has passed (public viewing) OR
-- 4. No release_date is set (immediately public)
CREATE POLICY "Users can view accessible roll images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'roll-images' AND
  EXISTS (
    SELECT 1 FROM rolls 
    WHERE rolls.id::text = (string_to_array(storage.objects.name, '/'))[1]
    AND (
      rolls.creator_id = auth.uid()  -- User owns the roll
      OR EXISTS (
        SELECT 1 FROM roll_contributors 
        WHERE roll_contributors.roll_id = rolls.id 
        AND roll_contributors.user_id = auth.uid()
      )  -- User is a contributor
      OR (rolls.release_date IS NOT NULL AND rolls.release_date <= NOW())  -- Release date has passed
      OR rolls.release_date IS NULL  -- No release date set (immediately public)
    )
  )
);

-- Allow anonymous users to view images if release_date has passed
-- This enables public viewing after release without authentication
CREATE POLICY "Anonymous users can view released roll images"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'roll-images' AND
  EXISTS (
    SELECT 1 FROM rolls 
    WHERE rolls.id::text = (string_to_array(storage.objects.name, '/'))[1]
    AND (
      (rolls.release_date IS NOT NULL AND rolls.release_date <= NOW())  -- Release date has passed
      OR rolls.release_date IS NULL  -- No release date set (immediately public)
    )
  )
);

-- Allow users to delete images they uploaded or from rolls they own
CREATE POLICY "Users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'roll-images' AND
  (
    -- Can delete if they own the roll
    (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    )
    OR
    -- Can delete if they uploaded it (check roll_images table)
    EXISTS (
      SELECT 1 FROM roll_images 
      WHERE image_url LIKE '%' || storage.objects.name 
      AND contributor_id = auth.uid()
    )
  )
);

-- ============================================
-- ✅ Storage policies configured!
-- ============================================
-- Now users can:
--   • Upload images to rolls they own or contribute to
--   • View images via signed URLs (access controlled by release_date)
--   • Delete images they uploaded or from their rolls
-- ============================================
-- 
-- NOTE: This bucket is PRIVATE - always use signed URLs for roll images
-- The app code should use getRollImageUrlAsync() to generate signed URLs
-- ============================================
