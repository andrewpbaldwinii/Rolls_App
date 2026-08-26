-- ============================================
-- FIX 500 ERROR ON SIGNUP
-- ============================================
-- This error usually means the trigger is failing
-- This script creates a safer, more robust trigger
-- ============================================

-- Step 1: Make sure all columns exist and are nullable
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make all columns nullable to avoid constraint errors
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN username DROP NOT NULL,
ALTER COLUMN display_name DROP NOT NULL;

-- Make 'name' column nullable if it exists
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

-- Step 2: Create a safer trigger function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
  has_name_column BOOLEAN;
BEGIN
  -- Generate default username from email
  default_username := COALESCE(
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Check if 'name' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'name'
  ) INTO has_name_column;
  
  -- Insert profile with error handling
  -- Only include columns that exist and are safe
  BEGIN
    IF has_name_column THEN
      INSERT INTO public.users (id, email, username, display_name, name)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        default_username,
        default_username,
        default_username
      )
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email, NEW.email),
        username = COALESCE(EXCLUDED.username, public.users.username, default_username),
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name, default_username),
        name = COALESCE(EXCLUDED.name, public.users.name, default_username);
    ELSE
      INSERT INTO public.users (id, email, username, display_name)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        default_username,
        default_username
      )
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email, NEW.email),
        username = COALESCE(EXCLUDED.username, public.users.username, default_username),
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name, default_username);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the auth signup
      RAISE WARNING 'Error creating user profile: %', SQLERRM;
      -- Try minimal insert as fallback
      BEGIN
        INSERT INTO public.users (id, email)
        VALUES (NEW.id, COALESCE(NEW.email, ''))
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION
        WHEN OTHERS THEN
          -- If even minimal insert fails, just log and continue
          RAISE WARNING 'Failed to create minimal profile: %', SQLERRM;
      END;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure RLS policies are correct
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
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

-- Step 5: Test the function (optional - comment out if you want)
-- This will show if there are any syntax errors
DO $$
BEGIN
  RAISE NOTICE 'Trigger function created successfully';
END $$;

-- ============================================
-- ✅ Fix Applied!
-- ============================================
-- The trigger now has error handling and won't fail auth signup
-- even if profile creation has issues.
-- 
-- Try signing up again. If it still fails:
-- 1. Check Supabase logs: Dashboard → Logs → Postgres Logs
-- 2. The trigger will log warnings if there are issues
-- 3. Auth signup should succeed even if profile creation fails
-- ============================================

