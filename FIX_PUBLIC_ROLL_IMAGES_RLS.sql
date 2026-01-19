-- Fix RLS policy for roll_images to allow viewing images from public rolls
-- This ensures that when a roll is marked as public (is_public = true),
-- anyone can view the images in that roll, regardless of release_date

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view images in accessible Rolls" ON roll_images;

-- Create updated policy that allows:
-- 1. Owner/contributors can always view
-- 2. Anyone can view if roll is public (is_public = true)
-- 3. Anyone can view if roll's release_date has passed (or is null)
CREATE POLICY "Users can view images in accessible Rolls"
  ON roll_images FOR SELECT
  USING (
    -- User owns the roll
    EXISTS (
      SELECT 1 FROM rolls 
      WHERE rolls.id = roll_images.roll_id 
      AND rolls.creator_id = auth.uid()
    )
    OR
    -- User is a contributor
    EXISTS (
      SELECT 1 FROM roll_contributors 
      WHERE roll_contributors.roll_id = roll_images.roll_id 
      AND roll_contributors.user_id = auth.uid()
    )
    OR
    -- Roll is public - anyone can view (regardless of release_date)
    EXISTS (
      SELECT 1 FROM rolls 
      WHERE rolls.id = roll_images.roll_id 
      AND rolls.is_public = TRUE
    )
    OR
    -- Roll's release date has passed (or is null) - public viewing
    EXISTS (
      SELECT 1 FROM rolls 
      WHERE rolls.id = roll_images.roll_id 
      AND (
        rolls.release_date IS NULL
        OR rolls.release_date <= NOW()
      )
    )
  );

-- ============================================
-- Verify the policy was created
-- ============================================
-- Run this query to verify:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'roll_images' AND policyname = 'Users can view images in accessible Rolls';
-- ============================================
