-- ============================================
-- Fix Trigger That's Causing Auth Signup to Fail
-- ============================================
-- The trigger is failing and blocking user creation
-- This version has better error handling
-- ============================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper error handling
-- This ensures trigger failures don't block auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
BEGIN
  -- Generate default username from email
  default_username := COALESCE(
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Try to insert profile, but don't fail if it errors
  -- Use a block to catch any errors
  BEGIN
    INSERT INTO public.users (id, email, username, display_name, name)
    VALUES (
      NEW.id,
      NEW.email,
      default_username,
      default_username,
      default_username
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    -- The app can create the profile later
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Alternative: Make trigger fire in background
-- ============================================
-- If the above still causes issues, we can use a different approach
-- that doesn't block the auth.users insert
-- ============================================

-- ============================================
-- ✅ Trigger updated with error handling
-- ============================================
-- Now if profile creation fails, it won't block user signup
-- ============================================

