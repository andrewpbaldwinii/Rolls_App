-- ============================================
-- Storage Policies for roll-images Bucket
-- ============================================
-- Run this AFTER creating the 'roll-images' bucket in Supabase Storage
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

-- Allow anyone to view images (since bucket is public)
-- This allows photos to be visible once release_date has passed
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'roll-images');

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
--   • View all images (public access)
--   • Delete images they uploaded or from their rolls
-- ============================================

