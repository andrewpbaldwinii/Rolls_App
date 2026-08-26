-- ============================================
-- QUICK FIX FOR SIGNUP ERRORS
-- ============================================
-- Run this first to fix immediate signup issues
-- Then run COMPLETE_PROFILE_SETUP.sql for full setup
-- ============================================

-- Step 1: Make sure email column exists and is nullable
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Step 2: Make sure all required columns exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Make 'name' column nullable if it exists
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
  END IF;
END $$;

-- Step 4: Fix the trigger function (handles 'name' column gracefully)
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
  
  -- Insert profile - only include 'name' if column exists
  IF has_name_column THEN
    INSERT INTO public.users (id, email, username, display_name, name)
    VALUES (
      NEW.id,
      NEW.email,
      default_username,
      default_username,
      default_username
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
      NEW.email,
      default_username,
      default_username
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.users.email),
      username = COALESCE(EXCLUDED.username, public.users.username),
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Ensure RLS policies allow profile creation
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ✅ Quick fix complete!
-- ============================================
-- Try signing up now. If it still fails, check:
-- 1. Run DIAGNOSE_SIGNUP_ERROR.sql to see what's wrong
-- 2. Check the console logs in your app for specific errors
-- ============================================

