-- ============================================
-- CREATE FOLLOWS TABLE FOR ROLLS APP
-- ============================================
-- This script creates the follows table for the following feature
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Create follows table
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Users can't follow themselves
);

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- ============================================
-- STEP 3: Enable Row Level Security
-- ============================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Drop existing policies if they exist
-- ============================================
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================
-- Anyone can view follows (for checking follow status)
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

-- Users can follow others (insert their own follows)
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- The follows table is now ready to use.
-- Users can now follow/unfollow each other.
-- ============================================
