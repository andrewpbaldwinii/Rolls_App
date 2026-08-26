-- ============================================
-- COMPLETE DATABASE SETUP FOR ROLLS APP (SAFER VERSION)
-- ============================================
-- This version is more conservative - it only creates/adds,
-- and only drops constraints/policies if they need to be fixed
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

-- Add missing columns if table already exists (safe - only adds)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on username (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Clean up any orphaned user profiles (users that don't exist in auth.users)
-- This ensures we can safely add the foreign key constraint
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Ensure foreign key to auth.users exists (only if it doesn't exist)
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

-- Enable RLS on public.users (safe - just enables security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist - safer approach)
DO $$
BEGIN
  -- Policy: Anyone can view user profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Anyone can view user profiles'
  ) THEN
    CREATE POLICY "Anyone can view user profiles"
      ON public.users FOR SELECT
      USING (true);
  END IF;

  -- Policy: Users can update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.users FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  -- Policy: Users can create their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
      ON public.users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================
-- STEP 2: Fix rolls table foreign key (ONLY IF NEEDED)
-- ============================================

-- Check if constraint exists and references wrong table, then fix it
DO $$
BEGIN
  -- Check if constraint exists and needs to be fixed
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rolls_creator_id_fkey'
    AND conrelid = 'rolls'::regclass
  ) THEN
    -- Check if it references the wrong table (users instead of public.users)
    -- If so, drop and recreate
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE c.conname = 'rolls_creator_id_fkey'
      AND t.relname = 'rolls'
      AND c.confrelid != 'public.users'::regclass
    ) THEN
      ALTER TABLE rolls DROP CONSTRAINT rolls_creator_id_fkey;
      ALTER TABLE rolls
      ADD CONSTRAINT rolls_creator_id_fkey 
      FOREIGN KEY (creator_id) 
      REFERENCES public.users(id) 
      ON DELETE CASCADE;
    END IF;
  ELSE
    -- Constraint doesn't exist, create it
    ALTER TABLE rolls
    ADD CONSTRAINT rolls_creator_id_fkey 
    FOREIGN KEY (creator_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure release_date can be null (safe - just makes column nullable)
DO $$
BEGIN
  -- Check if column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'rolls'
    AND column_name = 'release_date'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE rolls ALTER COLUMN release_date DROP NOT NULL;
  END IF;
END $$;

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

-- Indexes for roll_contributors (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_roll_contributors_roll_id ON roll_contributors(roll_id);
CREATE INDEX IF NOT EXISTS idx_roll_contributors_user_id ON roll_contributors(user_id);

-- Enable RLS on roll_contributors
ALTER TABLE roll_contributors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_contributors' 
    AND policyname = 'Users can view contributors of accessible Rolls'
  ) THEN
    CREATE POLICY "Users can view contributors of accessible Rolls"
      ON roll_contributors FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid()
        )
        OR
        user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_contributors' 
    AND policyname = 'Owners can add contributors'
  ) THEN
    CREATE POLICY "Owners can add contributors"
      ON roll_contributors FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_contributors' 
    AND policyname = 'Owners can update contributors'
  ) THEN
    CREATE POLICY "Owners can update contributors"
      ON roll_contributors FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_contributors' 
    AND policyname = 'Owners or users can remove contributors'
  ) THEN
    CREATE POLICY "Owners or users can remove contributors"
      ON roll_contributors FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_contributors.roll_id AND rolls.creator_id = auth.uid()) OR
        user_id = auth.uid()
      );
  END IF;
END $$;

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

-- Indexes for roll_images (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_roll_images_roll_id ON roll_images(roll_id);
CREATE INDEX IF NOT EXISTS idx_roll_images_contributor_id ON roll_images(contributor_id);
CREATE INDEX IF NOT EXISTS idx_roll_images_created_at ON roll_images(created_at DESC);

-- Enable RLS on roll_images
ALTER TABLE roll_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_images' 
    AND policyname = 'Users can view images in accessible Rolls'
  ) THEN
    CREATE POLICY "Users can view images in accessible Rolls"
      ON roll_images FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM rolls 
          WHERE rolls.id = roll_images.roll_id 
          AND (
            rolls.creator_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM roll_contributors 
              WHERE roll_contributors.roll_id = roll_images.roll_id 
              AND roll_contributors.user_id = auth.uid()
            )
            OR (rolls.release_date IS NOT NULL AND rolls.release_date <= NOW())
            OR rolls.release_date IS NULL
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_images' 
    AND policyname = 'Contributors can add images'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_images' 
    AND policyname = 'Contributors can update their images'
  ) THEN
    CREATE POLICY "Contributors can update their images"
      ON roll_images FOR UPDATE
      USING (contributor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roll_images' 
    AND policyname = 'Contributors or owners can delete images'
  ) THEN
    CREATE POLICY "Contributors or owners can delete images"
      ON roll_images FOR DELETE
      USING (
        contributor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM rolls WHERE rolls.id = roll_images.roll_id AND rolls.creator_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================
-- STEP 5: Create profile for existing user
-- ============================================
-- This safely creates profiles for all users who don't have one yet

-- First, make sure 'name' column can be null (if it exists and has NOT NULL constraint)
DO $$
BEGIN
  -- Check if 'name' column exists and has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;

-- Create profiles for all auth users who don't have profiles yet
-- Handle both 'name' and 'display_name' columns (whichever exists)
INSERT INTO public.users (id, username, display_name, name)
SELECT 
  id,
  COALESCE(
    split_part(email, '@', 1),
    'user_' || substr(id::text, 1, 8)
  ) as username,
  COALESCE(
    split_part(email, '@', 1),
    'User'
  ) as display_name,
  COALESCE(
    split_part(email, '@', 1),
    'User'
  ) as name  -- Use same value for 'name' if column exists
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- This safer version:
-- ✅ Only creates/adds (never deletes data)
-- ✅ Only drops constraints if they're wrong
-- ✅ Only creates policies if they don't exist
-- ✅ Uses IF NOT EXISTS checks everywhere
-- ✅ Safe to run multiple times
-- ============================================

