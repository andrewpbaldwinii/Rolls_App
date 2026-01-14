-- ============================================
-- PUBLIC PROFILE SETUP FOR ROLLS APP
-- ============================================
-- This script adds public profile functionality
-- Run this in Supabase SQL Editor after COMPLETE_DATABASE_SETUP.sql
-- ============================================

-- ============================================
-- STEP 1: Add is_public flag to rolls table
-- ============================================
ALTER TABLE rolls 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for public rolls queries
CREATE INDEX IF NOT EXISTS idx_rolls_is_public ON rolls(is_public) WHERE is_public = TRUE;

-- ============================================
-- STEP 2: Add is_public flag to roll_images table
-- ============================================
ALTER TABLE roll_images 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for public images queries
CREATE INDEX IF NOT EXISTS idx_roll_images_is_public ON roll_images(is_public) WHERE is_public = TRUE;

-- ============================================
-- STEP 3: Create follows table for followers/following
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Users can't follow themselves
);

-- Indexes for follows table
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Enable RLS on follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- STEP 4: Update RLS policies for public rolls
-- ============================================
-- Update roll_images policy to allow viewing public images
DROP POLICY IF EXISTS "Users can view images in accessible Rolls" ON roll_images;

CREATE POLICY "Users can view images in accessible Rolls"
  ON roll_images FOR SELECT
  USING (
    is_public = TRUE  -- Public images visible to everyone
    OR
    EXISTS (
      SELECT 1 FROM rolls 
      WHERE rolls.id = roll_images.roll_id 
      AND (
        rolls.creator_id = auth.uid()  -- User owns the roll
        OR EXISTS (
          SELECT 1 FROM roll_contributors 
          WHERE roll_contributors.roll_id = roll_images.roll_id 
          AND roll_contributors.user_id = auth.uid()
        )  -- User is a contributor
        OR (rolls.release_date IS NOT NULL AND rolls.release_date <= NOW())  -- Release date has passed (public)
        OR rolls.release_date IS NULL  -- No release date set (immediately public)
        OR rolls.is_public = TRUE  -- Roll is marked as public
      )
    )
  );

-- ============================================
-- STEP 5: Create function to get user stats
-- ============================================
CREATE OR REPLACE FUNCTION get_user_public_stats(user_uuid UUID)
RETURNS TABLE (
  rolls_created BIGINT,
  photos_taken BIGINT,
  followers_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM rolls WHERE creator_id = user_uuid AND is_public = TRUE)::BIGINT as rolls_created,
    (SELECT COUNT(*) FROM roll_images WHERE contributor_id = user_uuid AND is_public = TRUE)::BIGINT as photos_taken,
    (SELECT COUNT(*) FROM follows WHERE following_id = user_uuid)::BIGINT as followers_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- You now have:
-- ✅ is_public flag on rolls table
-- ✅ is_public flag on roll_images table
-- ✅ follows table for followers/following
-- ✅ Updated RLS policies for public content
-- ✅ Function to get user public stats
-- ============================================

