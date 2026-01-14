-- ============================================
-- Create Profile Automatically on Signup
-- ============================================
-- This uses a database trigger to create profiles automatically
-- when a new user signs up, bypassing RLS issues
-- ============================================

-- Function to create profile when user signs up
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
  
  -- Insert profile with username and display_name coordinated (same value)
  INSERT INTO public.users (id, email, username, display_name, name)
  VALUES (
    NEW.id,
    NEW.email,
    default_username,
    default_username,  -- display_name matches username
    default_username   -- name also matches for consistency
  )
  ON CONFLICT (id) DO NOTHING;
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
-- Alternative: Update existing profiles via trigger
-- ============================================
-- This allows the app to update username/display_name after creation
-- ============================================

-- Function to update profile when user metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email if it changed
  UPDATE public.users
  SET email = NEW.email
  WHERE id = NEW.id AND (email IS NULL OR email != NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires when user is updated in auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================
-- ✅ Done!
-- ============================================
-- Now profiles will be created automatically when users sign up.
-- The app can still update username/display_name after creation.
-- ============================================

