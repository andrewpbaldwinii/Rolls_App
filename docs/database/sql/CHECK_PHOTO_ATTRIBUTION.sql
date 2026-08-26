-- ============================================
-- Check Photo Attribution for Rolls
-- ============================================
-- This query helps diagnose why photos might not be showing up in rolls
-- Run this in Supabase SQL Editor to check your photos

-- 1. Check all photos in roll_images table
SELECT 
  ri.id,
  ri.roll_id,
  r.title as roll_title,
  ri.contributor_id,
  ri.image_url,
  ri.caption,
  ri.created_at,
  CASE 
    WHEN ri.contributor_id IS NULL THEN '⚠️ Missing contributor_id'
    ELSE '✅ Has contributor_id'
  END as contributor_status
FROM roll_images ri
LEFT JOIN rolls r ON r.id = ri.roll_id
ORDER BY ri.created_at DESC;

-- 2. Check photos for specific rolls (replace with your roll IDs)
-- SELECT 
--   ri.id,
--   ri.roll_id,
--   r.title as roll_title,
--   ri.contributor_id,
--   ri.image_url,
--   ri.caption
-- FROM roll_images ri
-- LEFT JOIN rolls r ON r.id = ri.roll_id
-- WHERE r.title IN ('Test', '2 Test')
-- ORDER BY ri.created_at DESC;

-- 3. Count photos per roll
SELECT 
  r.id,
  r.title,
  r.creator_id,
  COUNT(ri.id) as photo_count
FROM rolls r
LEFT JOIN roll_images ri ON ri.roll_id = r.id AND ri.caption != '__title_image__'
GROUP BY r.id, r.title, r.creator_id
ORDER BY r.created_at DESC;

-- 4. Check if photos have correct roll_id
-- If photos show up here but not in the app, the issue might be:
-- - RLS policy blocking access
-- - Missing contributor_id (though this shouldn't block if you own the roll)
-- - Wrong roll_id in the photos

