-- ============================================
-- Create Likes and Comments Tables
-- ============================================
-- This enables users to like and comment on photos
-- Supports both public_profile_photos and roll_images
-- ============================================

-- ============================================
-- 1. Create photo_likes table
-- ============================================
-- Stores likes on photos (both profile photos and roll images)
CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL, -- Can be from public_profile_photos or roll_images
  photo_type TEXT NOT NULL CHECK (photo_type IN ('profile_photo', 'roll_image')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can only like a photo once
  UNIQUE(photo_id, photo_type, user_id)
);

-- Indexes for photo_likes
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id, photo_type);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_created ON photo_likes(created_at DESC);

-- Enable RLS on photo_likes
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_likes (drop first so this script can be re-run safely)
DROP POLICY IF EXISTS "Anyone can view likes" ON photo_likes;
DROP POLICY IF EXISTS "Users can like photos" ON photo_likes;
DROP POLICY IF EXISTS "Users can unlike photos" ON photo_likes;

CREATE POLICY "Anyone can view likes"
  ON photo_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like photos"
  ON photo_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike photos"
  ON photo_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Create photo_comments table
-- ============================================
-- Stores comments on photos (both profile photos and roll images)
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL, -- Can be from public_profile_photos or roll_images
  photo_type TEXT NOT NULL CHECK (photo_type IN ('profile_photo', 'roll_image')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for photo_comments
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id, photo_type);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user ON photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_created ON photo_comments(created_at ASC);

-- Enable RLS on photo_comments
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON photo_comments;
DROP POLICY IF EXISTS "Users can comment on photos" ON photo_comments;
DROP POLICY IF EXISTS "Users can edit their own comments" ON photo_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON photo_comments;

CREATE POLICY "Anyone can view comments"
  ON photo_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can comment on photos"
  ON photo_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their own comments"
  ON photo_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON photo_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Create trigger to update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_photo_comments_updated_at ON photo_comments;
CREATE TRIGGER update_photo_comments_updated_at
  BEFORE UPDATE ON photo_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- You now have:
-- ✅ photo_likes table for tracking likes
-- ✅ photo_comments table for storing comments
-- ✅ RLS policies allowing public read, authenticated write
-- ✅ Users can like/comment on their own photos
-- ✅ Indexes for efficient queries
-- ============================================
