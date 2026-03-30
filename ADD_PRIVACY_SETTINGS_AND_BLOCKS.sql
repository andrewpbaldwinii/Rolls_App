-- Privacy settings (DM + public roll join) and user blocks.
-- Run in Supabase SQL Editor after ADD_PROFILE_PRIVACY.sql (or any users table migration).

-- ---------------------------------------------------------------------------
-- 1) User preference columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS message_allow_from TEXT NOT NULL DEFAULT 'anyone'
    CHECK (message_allow_from IN ('friends', 'anyone'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS public_roll_join_policy TEXT NOT NULL DEFAULT 'invite_only'
    CHECK (public_roll_join_policy IN ('friends', 'invite_only', 'anyone'));

COMMENT ON COLUMN public.users.message_allow_from IS
  'anyone: any user can start a DM (unless blocked). friends: only mutual followers can DM.';
COMMENT ON COLUMN public.users.public_roll_join_policy IS
  'friends: only mutual followers may join public rolls. invite_only: invite link or explicit invite only. anyone: open join.';

UPDATE public.users SET message_allow_from = 'anyone' WHERE message_allow_from IS NULL;
UPDATE public.users SET public_roll_join_policy = 'invite_only' WHERE public_roll_join_policy IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Blocks table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users read blocks involving them" ON public.user_blocks;
DROP POLICY IF EXISTS "Users insert own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users delete own blocks" ON public.user_blocks;

-- Blocked users must be able to read rows where they are blocked (to hide profiles / UX).
CREATE POLICY "Users read blocks involving them"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users insert own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------------
-- 3) Helpers (mutual follow = friends)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.users_mutually_follow(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f1
    WHERE f1.follower_id = a AND f1.following_id = b
  )
  AND EXISTS (
    SELECT 1 FROM public.follows f2
    WHERE f2.follower_id = b AND f2.following_id = a
  );
$$;

GRANT EXECUTE ON FUNCTION public.users_mutually_follow(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Enforce blocks + DM policy on new messages
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_message_privacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = NEW.recipient_id AND blocked_id = NEW.sender_id)
       OR (blocker_id = NEW.sender_id AND blocked_id = NEW.recipient_id)
  ) THEN
    RAISE EXCEPTION 'Messaging blocked or user blocked';
  END IF;

  SELECT message_allow_from INTO v_policy
  FROM public.users WHERE id = NEW.recipient_id;

  IF v_policy IS NULL THEN
    v_policy := 'anyone';
  END IF;

  IF v_policy = 'friends' THEN
    IF NOT public.users_mutually_follow(NEW.sender_id, NEW.recipient_id) THEN
      RAISE EXCEPTION 'Recipient only accepts messages from friends (mutual followers)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_privacy ON public.messages;
CREATE TRIGGER trg_enforce_message_privacy
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_privacy();

-- ---------------------------------------------------------------------------
-- 5) Public roll join policy (creator setting on users.public_roll_join_policy)
--    Requires CREATE_ROLL_INVITES_TABLE.sql (accept_roll_invite functions).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_public_roll_join_for_user(
  p_roll_id UUID,
  p_joining_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_is_public BOOLEAN;
  v_policy TEXT;
BEGIN
  SELECT creator_id, COALESCE(is_public, false)
  INTO v_creator_id, v_is_public
  FROM public.rolls
  WHERE id = p_roll_id;

  IF NOT FOUND OR v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Roll not found';
  END IF;

  IF NOT v_is_public THEN
    RETURN;
  END IF;

  SELECT public_roll_join_policy INTO v_policy
  FROM public.users
  WHERE id = v_creator_id;

  IF v_policy IS NULL THEN
    v_policy := 'invite_only';
  END IF;

  IF v_policy = 'anyone' THEN
    RETURN;
  END IF;

  IF v_policy = 'invite_only' THEN
    -- Caller must only reach INSERT after a valid invite (token / user / email flow).
    RETURN;
  END IF;

  IF v_policy = 'friends' THEN
    IF NOT public.users_mutually_follow(p_joining_user_id, v_creator_id) THEN
      RAISE EXCEPTION 'This public roll only allows mutual followers to join';
    END IF;
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_public_roll_join_for_user(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_roll_invite(p_invite_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite_record roll_invites%ROWTYPE;
  v_contributor_exists BOOLEAN;
BEGIN
  SELECT * INTO v_invite_record
  FROM roll_invites
  WHERE id = p_invite_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  PERFORM public.enforce_public_roll_join_for_user(v_invite_record.roll_id, p_user_id);

  SELECT EXISTS(
    SELECT 1 FROM roll_contributors
    WHERE roll_id = v_invite_record.roll_id
      AND user_id = p_user_id
  ) INTO v_contributor_exists;

  IF v_contributor_exists THEN
    UPDATE roll_invites
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = p_invite_id;
    RETURN TRUE;
  END IF;

  INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
  VALUES (v_invite_record.roll_id, p_user_id, 'contributor', v_invite_record.inviter_id)
  ON CONFLICT (roll_id, user_id) DO UPDATE
  SET role = 'contributor',
      invited_by = v_invite_record.inviter_id;

  UPDATE roll_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_user_id = p_user_id
  WHERE id = p_invite_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_roll_invite_by_token(p_token TEXT, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_invite_id UUID;
  v_roll_id UUID;
BEGIN
  SELECT id, roll_id INTO v_invite_id, v_roll_id
  FROM roll_invites
  WHERE invite_token = p_token
    AND status = 'pending'
    AND method = 'link'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  PERFORM public.enforce_public_roll_join_for_user(v_roll_id, p_user_id);

  IF EXISTS(
    SELECT 1 FROM roll_contributors
    WHERE roll_id = v_roll_id AND user_id = p_user_id
  ) THEN
    UPDATE roll_invites
    SET status = 'accepted', accepted_at = NOW(), invitee_user_id = p_user_id
    WHERE id = v_invite_id;
    RETURN v_roll_id;
  END IF;

  INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
  SELECT v_roll_id, p_user_id, 'contributor', inviter_id
  FROM roll_invites
  WHERE id = v_invite_id
  ON CONFLICT (roll_id, user_id) DO NOTHING;

  UPDATE roll_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_user_id = p_user_id
  WHERE id = v_invite_id;

  RETURN v_roll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
