-- ============================================
-- FIX ROLL_INVITES RLS PERMISSIONS
-- ============================================
-- This script fixes the "permission denied for table users" error
-- Run this in Supabase SQL Editor
-- ============================================

-- Create helper function to check roll ownership (SECURITY DEFINER)
-- This bypasses RLS to avoid permission issues
CREATE OR REPLACE FUNCTION user_owns_roll(p_roll_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rolls 
    WHERE id = p_roll_id 
    AND creator_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_owns_roll(UUID, UUID) TO authenticated;

-- Drop and recreate the INSERT policy to ensure it works correctly
DROP POLICY IF EXISTS "Roll owners can create invites" ON roll_invites;

CREATE POLICY "Roll owners can create invites"
  ON roll_invites FOR INSERT
  WITH CHECK (
    -- Verify user is authenticated
    auth.uid() IS NOT NULL AND
    -- Verify user owns the roll (using SECURITY DEFINER function to avoid RLS issues)
    user_owns_roll(roll_invites.roll_id, auth.uid()) AND
    -- Verify inviter_id matches authenticated user
    inviter_id = auth.uid()
  );

-- Also ensure the SELECT policy doesn't try to access auth.users
DROP POLICY IF EXISTS "Users can view invites for their rolls" ON roll_invites;

CREATE POLICY "Users can view invites for their rolls"
  ON roll_invites FOR SELECT
  USING (
    -- Roll owners can see all invites for their rolls (using SECURITY DEFINER function)
    user_owns_roll(roll_invites.roll_id, auth.uid()) OR
    -- Users can see invites sent to them (by user_id)
    invitee_user_id = auth.uid()
  );

-- Update policy for accepting invites
DROP POLICY IF EXISTS "Users can update their own invites" ON roll_invites;

CREATE POLICY "Users can update their own invites"
  ON roll_invites FOR UPDATE
  USING (
    -- Invitees can accept/decline their invites (by user_id)
    invitee_user_id = auth.uid()
  );
