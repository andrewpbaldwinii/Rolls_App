-- ============================================
-- Create public_profile_photos Table
-- ============================================
-- This table stores standalone public photos that are NOT attached to any roll
-- These photos appear in the Photos tab on public profiles

CREATE TABLE IF NOT EXISTS public_profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Supabase Storage path or URL
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for public_profile_photos
CREATE INDEX IF NOT EXISTS idx_public_profile_photos_user_id ON public_profile_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_public_profile_photos_created_at ON public_profile_photos(created_at DESC);

-- Enable RLS on public_profile_photos
ALTER TABLE public_profile_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_profile_photos
-- Drop existing policies if they exist (allows re-running this script)

-- Anyone can view public profile photos (they're public by design)
DROP POLICY IF EXISTS "Anyone can view public profile photos" ON public_profile_photos;
CREATE POLICY "Anyone can view public profile photos"
  ON public_profile_photos FOR SELECT
  USING (true);

-- Users can insert their own photos
DROP POLICY IF EXISTS "Users can insert their own public profile photos" ON public_profile_photos;
CREATE POLICY "Users can insert their own public profile photos"
  ON public_profile_photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own photos
DROP POLICY IF EXISTS "Users can update their own public profile photos" ON public_profile_photos;
CREATE POLICY "Users can update their own public profile photos"
  ON public_profile_photos FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own photos
DROP POLICY IF EXISTS "Users can delete their own public profile photos" ON public_profile_photos;
CREATE POLICY "Users can delete their own public profile photos"
  ON public_profile_photos FOR DELETE
  USING (user_id = auth.uid());

