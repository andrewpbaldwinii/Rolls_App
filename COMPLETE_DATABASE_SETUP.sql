-- ============================================
-- COMPLETE DATABASE SETUP FOR ROLLS APP
-- ============================================
-- Run this entire script in Supabase SQL Editor
-- It will set up everything you need in the correct order
-- ============================================

-- ============================================
-- STEP 1: Set up public.users table (User Profiles)
-- ============================================

-- Create public.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on username
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Ensure foreign key to auth.users exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_id_fkey'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;

-- Create RLS policies for public.users
-- Allow public viewing of profiles (for displaying usernames, avatars in rolls)
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 2: Fix rolls table foreign key
-- ============================================

-- Drop old constraint (might reference wrong table)
ALTER TABLE rolls 
DROP CONSTRAINT IF EXISTS rolls_creator_id_fkey;

-- Create correct foreign key to public.users
ALTER TABLE rolls
ADD CONSTRAINT rolls_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Ensure release_date can be null (for optional Develop date)
ALTER TABLE rolls 
ALTER COLUMN release_date DROP NOT NULL;

-- ============================================
-- STEP 3: Create roll_contributors table
-- ============================================

CREATE TABLE IF NOT EXISTS roll_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll_id, user_id)
);

-- Indexes for roll_contributors
CREATE INDEX IF NOT EXISTS idx_roll_contributors_roll_id ON roll_contributors(roll_id);
CREATE INDEX IF NOT EXISTS idx_roll_contributors_user_id ON roll_contributors(user_id);

-- Enable RLS on roll_contributors
ALTER TABLE roll_contributors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view contributors of accessible Rolls" ON roll_contributors;
DROP POLICY IF EXISTS "Owners can add contributors" ON roll_contributors;
DROP POLICY IF EXISTS "Owners can update contributors" ON roll_contributors;
DROP POLICY IF EXISTS "Owners or users can remove contributors" ON roll_contributors;

-- RLS Policies for roll_contributors
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
    EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid())
  );

CREATE POLICY "Owners can update contributors"
  ON roll_contributors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid())
  );

CREATE POLICY "Owners or users can remove contributors"
  ON roll_contributors FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- ============================================
-- STEP 4: Create roll_images table
-- ============================================

CREATE TABLE IF NOT EXISTS roll_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  contributor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for roll_images
CREATE INDEX IF NOT EXISTS idx_roll_images_roll_id ON roll_images(roll_id);
CREATE INDEX IF NOT EXISTS idx_roll_images_contributor_id ON roll_images(contributor_id);
CREATE INDEX IF NOT EXISTS idx_roll_images_created_at ON roll_images(created_at DESC);

-- Enable RLS on roll_images
ALTER TABLE roll_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view images in accessible Rolls" ON roll_images;
DROP POLICY IF EXISTS "Contributors can add images" ON roll_images;
DROP POLICY IF EXISTS "Contributors can update their images" ON roll_images;
DROP POLICY IF EXISTS "Contributors or owners can delete images" ON roll_images;

-- RLS Policies for roll_images
-- Allow viewing images if:
-- 1. User owns the roll, OR
-- 2. User is a contributor, OR  
-- 3. Roll's release_date has passed (public viewing), OR
-- 4. No release_date is set (immediately public)
CREATE POLICY "Users can view images in accessible Rolls"
  ON roll_images FOR SELECT
  USING (
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
      )
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
    EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_images.roll_id AND rolls.creator_id = auth.uid())
  );

-- ============================================
-- STEP 5: Create profile for existing user
-- ============================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can find it by running: SELECT id, email FROM auth.users;

-- This will create a profile for your existing test user
-- Update the user ID below:
INSERT INTO public.users (id, username, display_name)
SELECT 
  id,
  COALESCE(
    split_part(email, '@', 1),  -- Use email prefix as default username
    'user_' || substr(id::text, 1, 8)  -- Fallback to user_ + first 8 chars of ID
  ) as username,
  COALESCE(
    split_part(email, '@', 1),  -- Use email prefix as default display name
    'User'
  ) as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- You now have:
-- ✅ public.users table with profiles
-- ✅ rolls table with correct foreign keys
-- ✅ roll_contributors table for invites
-- ✅ roll_images table for photos
-- ✅ All RLS policies configured
-- ✅ Profile created for existing user
-- ============================================

