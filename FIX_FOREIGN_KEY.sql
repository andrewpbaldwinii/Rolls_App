-- ============================================
-- Fix Foreign Key Constraint for rolls.creator_id
-- ============================================
-- Run this in Supabase SQL Editor
-- This fixes the foreign key constraint violation
--
-- The error shows the constraint is referencing "users" table
-- but it should reference "auth.users" table
-- ============================================

-- Drop the existing constraint (it's referencing the wrong table)
ALTER TABLE rolls 
DROP CONSTRAINT IF EXISTS rolls_creator_id_fkey;

-- Recreate the foreign key constraint to reference auth.users(id)
ALTER TABLE rolls
ADD CONSTRAINT rolls_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ============================================
-- Alternative: If the above doesn't work, try this:
-- ============================================
-- Sometimes Supabase requires a different approach.
-- If you still get errors, the issue might be that:
-- 1. The user ID format doesn't match
-- 2. The user doesn't exist in auth.users yet

-- To verify the user exists, run this query:
-- SELECT id, email FROM auth.users WHERE id = 'YOUR_USER_ID_HERE';

-- ============================================
-- ✅ Done! The foreign key should now work correctly.
-- ============================================

