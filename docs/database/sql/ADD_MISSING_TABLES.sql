-- ============================================
-- Add Missing Tables: roll_contributors and roll_images
-- ============================================
-- Run this in Supabase SQL Editor
-- This assumes the 'rolls' table already exists

-- ============================================
-- 1. Create roll_contributors Table
-- ============================================

CREATE TABLE roll_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll_id, user_id)
);

-- Indexes for roll_contributors
CREATE INDEX idx_roll_contributors_roll_id ON roll_contributors(roll_id);
CREATE INDEX idx_roll_contributors_user_id ON roll_contributors(user_id);

-- Enable RLS on roll_contributors
ALTER TABLE roll_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roll_contributors
-- Note: Using creator_id (your existing column) instead of owner_id
CREATE POLICY "Users can view contributors of accessible Rolls"
  ON roll_contributors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Owners can add contributors"
  ON roll_contributors FOR INSERT
  WITH CHECK (
    roll_id IN (SELECT id FROM rolls WHERE creator_id = auth.uid())
  );

CREATE POLICY "Owners can update contributors"
  ON roll_contributors FOR UPDATE
  USING (
    roll_id IN (SELECT id FROM rolls WHERE creator_id = auth.uid())
  );

CREATE POLICY "Owners or users can remove contributors"
  ON roll_contributors FOR DELETE
  USING (
    roll_id IN (SELECT id FROM rolls WHERE creator_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- ============================================
-- 2. Create roll_images Table
-- ============================================

CREATE TABLE roll_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Supabase Storage path or URL
  contributor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for roll_images
CREATE INDEX idx_roll_images_roll_id ON roll_images(roll_id);
CREATE INDEX idx_roll_images_contributor_id ON roll_images(contributor_id);
CREATE INDEX idx_roll_images_created_at ON roll_images(created_at DESC);

-- Enable RLS on roll_images
ALTER TABLE roll_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roll_images
-- Note: Using creator_id (your existing column) instead of owner_id
CREATE POLICY "Users can view images in accessible Rolls"
  ON roll_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rolls WHERE rolls.id = roll_images.roll_id AND rolls.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM roll_contributors 
      WHERE roll_contributors.roll_id = roll_images.roll_id 
      AND roll_contributors.user_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can add images"
  ON roll_images FOR INSERT
  WITH CHECK (
    contributor_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM rolls WHERE rolls.id = roll_images.roll_id AND rolls.creator_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM roll_contributors 
        WHERE roll_contributors.roll_id = roll_images.roll_id 
        AND roll_contributors.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Contributors can update their images"
  ON roll_images FOR UPDATE
  USING (contributor_id = auth.uid());

CREATE POLICY "Contributors or owners can delete images"
  ON roll_images FOR DELETE
  USING (
    contributor_id = auth.uid() OR
    roll_id IN (SELECT id FROM rolls WHERE creator_id = auth.uid())
  );

-- ============================================
-- ✅ Done! Both tables are now created with:
--    - Proper foreign key relationships
--    - Indexes for performance
--    - RLS enabled
--    - Security policies in place
-- ============================================

