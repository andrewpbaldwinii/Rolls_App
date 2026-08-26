-- ============================================
-- COMPLETE PROFILE SETUP FOR ROLLS APP
-- ============================================
-- This script ensures profiles are created correctly
-- and are publicly viewable for rolls and public profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Ensure users table structure is correct
-- ============================================

-- Add email column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Make email column nullable (to avoid NOT NULL constraint errors)
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make 'name' column nullable if it exists and has NOT NULL
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
    RAISE NOTICE 'Made name column nullable';
  END IF;
END $$;

-- ============================================
-- STEP 2: Update existing profiles with email
-- ============================================

-- Update existing profiles that have NULL email
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id 
  AND (u.email IS NULL OR u.email = '');

-- ============================================
-- STEP 3: Create profiles for users who don't have one
-- ============================================

INSERT INTO public.users (id, username, display_name, email)
SELECT 
  a.id,
  COALESCE(
    split_part(a.email, '@', 1),
    'user_' || substr(a.id::text, 1, 8)
  ) as username,
  COALESCE(
    split_part(a.email, '@', 1),
    'User'
  ) as display_name,
  a.email as email
FROM auth.users a
WHERE a.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, public.users.email),
  username = COALESCE(EXCLUDED.username, public.users.username),
  display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);

-- ============================================
-- STEP 4: Update trigger to always include email
-- ============================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
  has_name_column BOOLEAN;
BEGIN
  -- Generate default username from email
  default_username := COALESCE(
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Check if 'name' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'name'
  ) INTO has_name_column;
  
  -- Insert profile with email, username, and display_name
  -- Email is included to satisfy foreign key constraints
  -- Only include 'name' if the column exists
  IF has_name_column THEN
    INSERT INTO public.users (id, email, username, display_name, name)
    VALUES (
      NEW.id,
      NEW.email,  -- Always include email
      default_username,
      default_username,  -- display_name matches username initially
      default_username   -- name also matches for consistency
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.users.email),
      username = COALESCE(EXCLUDED.username, public.users.username),
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
      name = COALESCE(EXCLUDED.name, public.users.name);
  ELSE
    INSERT INTO public.users (id, email, username, display_name)
    VALUES (
      NEW.id,
      NEW.email,  -- Always include email
      default_username,
      default_username  -- display_name matches username initially
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.users.email),
      username = COALESCE(EXCLUDED.username, public.users.username),
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Ensure RLS policies allow public viewing
-- ============================================

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Policy 1: Users can create their own profile (required for signup)
CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 2: Anyone can view user profiles (required for public profiles and rolls)
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 6: Ensure foreign key constraint is correct
-- ============================================

-- Drop old constraint if it exists
ALTER TABLE rolls 
DROP CONSTRAINT IF EXISTS rolls_creator_id_fkey;

-- Create correct foreign key to public.users
ALTER TABLE rolls
ADD CONSTRAINT rolls_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- Now:
--   • All users have profiles with email
--   • Profiles are publicly viewable
--   • Users can create rolls (foreign key works)
--   • Public profiles can be viewed
--   • Signup automatically creates profiles with email
-- ============================================

