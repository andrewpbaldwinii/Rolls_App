-- ============================================
-- Create roll-title-images Bucket
-- ============================================
-- This bucket is separate from roll-images to avoid conflicts
-- Title images are always public and have different access patterns
-- ============================================
-- 
-- STEP 1: Create the bucket in Supabase Dashboard
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: roll-title-images
-- 4. Make it PUBLIC (toggle ON) - title images are always public
-- 5. File size limit: 10MB (recommended)
-- 6. Allowed MIME types: image/jpeg, image/png, image/heic, image/webp
-- 7. Click "Create bucket"
--
-- STEP 2: Run the policies below
-- ============================================

-- ============================================
-- Storage Policies for roll-title-images Bucket
-- ============================================
-- Title images are simpler: only owners can upload/delete them
-- They're always public (bucket is public)
-- ============================================

-- Allow roll owners to upload title images
CREATE POLICY "Roll owners can upload title images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'roll-title-images' AND
  -- Extract roll_id from path (format: roll_id/filename.jpg)
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
  )
);

-- Allow anyone to view title images (bucket is public, but explicit policy for clarity)
CREATE POLICY "Anyone can view title images"
ON storage.objects FOR SELECT
USING (bucket_id = 'roll-title-images');

-- Allow roll owners to delete title images
CREATE POLICY "Roll owners can delete title images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'roll-title-images' AND
  -- Can delete if they own the roll
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
  )
);

-- ============================================
-- ✅ Storage policies configured!
-- ============================================
-- Now roll owners can:
--   • Upload title images to their rolls
--   • View all title images (public access)
--   • Delete title images from their rolls
-- ============================================
-- 
-- NOTE: After running this, update your app code to use:
--   - roll-title-images bucket for title images
--   - roll-images bucket for roll images (camera photos)
-- ============================================

