-- ============================================
-- Fix RLS Policies for roll_images Table
-- ============================================
-- This fixes the issue where roll images are not visible
-- even though they're successfully uploaded
-- ============================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view images in accessible Rolls" ON roll_images;

-- Create a new, properly structured SELECT policy
-- Users can view images if:
-- 1. They own the roll (creator_id matches), OR
-- 2. They are a contributor to the roll, OR
-- 3. The roll's release_date has passed (public viewing), OR
-- 4. No release_date is set (immediately public)
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
    -- Roll exists and release date has passed (or is null) - public viewing
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
