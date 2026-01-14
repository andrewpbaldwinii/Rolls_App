-- ============================================
-- Fix users table structure
-- ============================================
-- Run this if you get errors about missing columns or NOT NULL constraints
-- ============================================

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

-- Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add email column if it doesn't exist (some schemas have it)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================
-- Now create profiles for users who need them
-- ============================================
-- Handle both cases: with email column and without

INSERT INTO public.users (id, username, display_name, name, email)
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
  COALESCE(
    split_part(a.email, '@', 1),
    'User'
  ) as name,
  a.email as email  -- Include email from auth.users
FROM auth.users a
WHERE a.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  username = COALESCE(EXCLUDED.username, public.users.username),
  display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
  name = COALESCE(EXCLUDED.name, public.users.name),
  email = COALESCE(EXCLUDED.email, public.users.email);

-- Update existing profiles that have NULL email
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id 
  AND u.email IS NULL;

-- ============================================
-- STEP: Set up RLS Policies (if not already done)
-- ============================================

-- Enable RLS on public.users (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Policy 1: Users can create their own profile (required for signup)
CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 2: Anyone can view user profiles
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ✅ Done! 
-- ============================================
-- Now:
--   • All columns are added
--   • Profiles are created for existing users
--   • RLS policies allow signup to work
-- ============================================

