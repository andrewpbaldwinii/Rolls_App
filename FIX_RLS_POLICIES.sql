-- ============================================
-- Fix RLS Policies for public.users
-- ============================================
-- This ensures users can create their own profiles during signup
-- ============================================

-- Enable RLS on public.users (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Policy 1: Users can create their own profile
-- This allows signup to work - users can insert their own profile
-- Note: During signup, auth.uid() might not be available yet,
-- so we also use a database trigger (CREATE_PROFILE_TRIGGER.sql) as backup
CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Policy 2: Anyone can view user profiles
-- This allows users to see each other's profiles
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- Policy 3: Users can update their own profile
-- This allows users to update their own username, display_name, etc.
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ✅ RLS Policies Fixed!
-- ============================================
-- Now users can:
--   • Create their own profile during signup
--   • View all user profiles
--   • Update their own profile
-- ============================================

