-- ============================================
-- Add Profile Privacy Feature
-- ============================================
-- This adds the ability for users to make their profiles private
-- Private profiles: Only followers can see photos and rolls
-- Public profiles: Anyone can see (existing behavior)
-- ============================================

-- ============================================
-- STEP 1: Add profile_is_public column to users table
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_is_public BOOLEAN DEFAULT TRUE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_profile_is_public ON users(profile_is_public) WHERE profile_is_public = FALSE;

-- Update existing users to be public by default (if needed)
UPDATE users SET profile_is_public = TRUE WHERE profile_is_public IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.profile_is_public IS 'If FALSE, only followers can view this user''s profile, photos, and rolls. If TRUE, anyone can view (public profile).';

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- You now have:
-- ✅ profile_is_public column on users table
-- ✅ Default value is TRUE (public by default)
-- ✅ Index for efficient private profile queries
-- ============================================
