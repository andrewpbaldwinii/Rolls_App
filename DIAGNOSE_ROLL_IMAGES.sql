-- ============================================
-- Diagnose Roll Images Issue
-- ============================================
-- This script helps diagnose why roll images aren't appearing
-- ============================================

-- 1. Check if roll_images table has data for the specific roll
SELECT 
  id,
  roll_id,
  image_url,
  contributor_id,
  caption,
  created_at,
  LENGTH(image_url) as url_length
FROM roll_images
WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc'
ORDER BY created_at DESC;

-- 2. Check total count of images for this roll
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT contributor_id) as unique_contributors
FROM roll_images
WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc'
  AND caption != '__title_image__';

-- 3. Check if the roll exists
SELECT 
  id,
  title,
  creator_id,
  status,
  release_date,
  title_image_url
FROM rolls
WHERE id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc';

-- 4. Check roll_contributors for this roll
SELECT 
  user_id,
  role
FROM roll_contributors
WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc';

-- 5. Check storage bucket structure (if you have access)
-- This will show what files exist in storage for this roll
-- Note: This requires storage admin access
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'roll-images'
  AND name LIKE '3a52b2cd-5531-45e3-8aa2-f042a38a13cc/%'
ORDER BY created_at DESC;

-- 6. Verify image URLs are valid format
SELECT 
  id,
  image_url,
  CASE 
    WHEN image_url LIKE '%/storage/v1/object/public/roll-images/%' THEN '✅ Valid public URL format'
    WHEN image_url LIKE '%/storage/v1/object/sign/roll-images/%' THEN '✅ Valid signed URL format'
    ELSE '❌ Invalid URL format'
  END as url_status
FROM roll_images
WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc'
  AND caption != '__title_image__';

-- ============================================
-- Expected Results:
-- ============================================
-- 1. Should show all images for the roll
-- 2. Should show count > 0 if images exist
-- 3. Should show the roll details
-- 4. Should show contributors (including owner)
-- 5. Should show files in storage bucket
-- 6. Should show URL format validation
-- ============================================

