-- ============================================
-- ROLL INVITES SETUP
-- ============================================
-- This script adds roll invite functionality
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Add related_roll_id to notifications table
-- ============================================
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_roll_id UUID REFERENCES rolls(id) ON DELETE CASCADE;

-- Add index for roll-related notifications
CREATE INDEX IF NOT EXISTS idx_notifications_roll ON notifications(related_roll_id);

-- ============================================
-- STEP 2: Create roll_invites table
-- ============================================
-- This table tracks pending invitations to rolls
-- Used for both email invites and user profile invites
CREATE TABLE IF NOT EXISTS roll_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- For user profile invites
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- For email invites
  invitee_email TEXT,
  
  -- Invite token for deep linking (unique per roll, reusable)
  invite_token TEXT UNIQUE,
  
  -- Status: 'pending', 'accepted', 'declined'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  
  -- Invite method: 'link', 'user', 'email'
  method TEXT NOT NULL CHECK (method IN ('link', 'user', 'email')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  
  -- Either invitee_user_id OR invitee_email must be set
  CHECK (
    (invitee_user_id IS NOT NULL AND invitee_email IS NULL) OR
    (invitee_email IS NOT NULL AND invitee_user_id IS NULL) OR
    (invite_token IS NOT NULL AND invitee_user_id IS NULL AND invitee_email IS NULL) -- For open link invites
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roll_invites_roll_id ON roll_invites(roll_id);
CREATE INDEX IF NOT EXISTS idx_roll_invites_invitee_user ON roll_invites(invitee_user_id) WHERE invitee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roll_invites_invitee_email ON roll_invites(invitee_email) WHERE invitee_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roll_invites_token ON roll_invites(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roll_invites_status ON roll_invites(status);
CREATE INDEX IF NOT EXISTS idx_roll_invites_inviter ON roll_invites(inviter_id);

-- Enable RLS
ALTER TABLE roll_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roll_invites
DROP POLICY IF EXISTS "Users can view invites for their rolls" ON roll_invites;
CREATE POLICY "Users can view invites for their rolls"
  ON roll_invites FOR SELECT
  USING (
    -- Roll owners can see all invites for their rolls (using SECURITY DEFINER function)
    user_owns_roll(roll_invites.roll_id, auth.uid()) OR
    -- Users can see invites sent to them (by user_id)
    invitee_user_id = auth.uid()
    -- Note: Email-based invites are visible to roll owners only
    -- Users will see email invites when they accept via token
  );

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

DROP POLICY IF EXISTS "Users can update their own invites" ON roll_invites;
CREATE POLICY "Users can update their own invites"
  ON roll_invites FOR UPDATE
  USING (
    -- Invitees can accept/decline their invites (by user_id)
    invitee_user_id = auth.uid()
    -- Note: Email invites are updated via token acceptance function
  );

-- ============================================
-- STEP 3: Helper function to check roll ownership (SECURITY DEFINER)
-- ============================================
-- This function bypasses RLS to check if a user owns a roll
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

-- ============================================
-- STEP 4: Function to generate or get invite token
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_roll_invite_token(p_roll_id UUID, p_inviter_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_existing_token TEXT;
BEGIN
  -- Check if token already exists for this roll (link-based invite)
  SELECT invite_token INTO v_existing_token
  FROM roll_invites
  WHERE roll_id = p_roll_id
    AND method = 'link'
    AND invite_token IS NOT NULL
    AND status = 'pending'
  LIMIT 1;

  IF v_existing_token IS NOT NULL THEN
    RETURN v_existing_token;
  END IF;

  -- Generate new token (using roll_id + random string)
  v_token := p_roll_id::TEXT || '-' || encode(gen_random_bytes(16), 'hex');

  -- Create invite record for link-based invite
  INSERT INTO roll_invites (roll_id, inviter_id, method, invite_token, status)
  VALUES (p_roll_id, p_inviter_id, 'link', v_token, 'pending')
  ON CONFLICT (invite_token) DO NOTHING
  RETURNING invite_token INTO v_token;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Function to accept roll invite
-- ============================================
CREATE OR REPLACE FUNCTION accept_roll_invite(p_invite_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite_record roll_invites%ROWTYPE;
  v_contributor_exists BOOLEAN;
BEGIN
  -- Get invite record
  SELECT * INTO v_invite_record
  FROM roll_invites
  WHERE id = p_invite_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  -- Check if user is already a contributor
  SELECT EXISTS(
    SELECT 1 FROM roll_contributors
    WHERE roll_id = v_invite_record.roll_id
      AND user_id = p_user_id
  ) INTO v_contributor_exists;

  IF v_contributor_exists THEN
    -- Already a contributor, mark invite as accepted anyway
    UPDATE roll_invites
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = p_invite_id;
    RETURN TRUE;
  END IF;

  -- Add user as contributor
  INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
  VALUES (v_invite_record.roll_id, p_user_id, 'contributor', v_invite_record.inviter_id)
  ON CONFLICT (roll_id, user_id) DO UPDATE
  SET role = 'contributor',
      invited_by = v_invite_record.inviter_id;

  -- Mark invite as accepted
  UPDATE roll_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_user_id = p_user_id
  WHERE id = p_invite_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Function to accept invite by token
-- ============================================
CREATE OR REPLACE FUNCTION accept_roll_invite_by_token(p_token TEXT, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_invite_id UUID;
  v_roll_id UUID;
BEGIN
  -- Find pending invite by token
  SELECT id, roll_id INTO v_invite_id, v_roll_id
  FROM roll_invites
  WHERE invite_token = p_token
    AND status = 'pending'
    AND method = 'link'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Check if already a contributor
  IF EXISTS(
    SELECT 1 FROM roll_contributors
    WHERE roll_id = v_roll_id AND user_id = p_user_id
  ) THEN
    -- Already a contributor, return roll_id
    UPDATE roll_invites
    SET status = 'accepted', accepted_at = NOW(), invitee_user_id = p_user_id
    WHERE id = v_invite_id;
    RETURN v_roll_id;
  END IF;

  -- Add as contributor
  INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
  SELECT v_roll_id, p_user_id, 'contributor', inviter_id
  FROM roll_invites
  WHERE id = v_invite_id
  ON CONFLICT (roll_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE roll_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_user_id = p_user_id
  WHERE id = v_invite_id;

  RETURN v_roll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Function to create roll invite notification
-- ============================================
CREATE OR REPLACE FUNCTION create_roll_invite_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for user invites (not link or email)
  IF NEW.method = 'user' AND NEW.invitee_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, related_user_id, related_roll_id)
    VALUES (
      NEW.invitee_user_id,
      'roll_invite',
      'Roll Invitation',
      'You''ve been invited to contribute to a Roll',
      NEW.inviter_id,
      NEW.roll_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on new user invite
DROP TRIGGER IF EXISTS trigger_create_roll_invite_notification ON roll_invites;
CREATE TRIGGER trigger_create_roll_invite_notification
  AFTER INSERT ON roll_invites
  FOR EACH ROW
  WHEN (NEW.method = 'user' AND NEW.invitee_user_id IS NOT NULL)
  EXECUTE FUNCTION create_roll_invite_notification();

-- ============================================
-- STEP 7: Grant permissions
-- ============================================
GRANT ALL ON roll_invites TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_roll(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_roll_invite_token(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_roll_invite(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_roll_invite_by_token(TEXT, UUID) TO authenticated;
