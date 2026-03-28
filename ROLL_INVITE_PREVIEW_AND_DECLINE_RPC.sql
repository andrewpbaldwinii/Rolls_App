-- Run in Supabase SQL Editor (after CREATE_ROLL_INVITES_TABLE.sql).
-- Fixes: contributors cannot read roll_invites via RLS (link invites). Preview + decline use SECURITY DEFINER.

CREATE OR REPLACE FUNCTION get_roll_invite_preview_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite roll_invites%ROWTYPE;
  v_roll JSON;
  v_inviter JSON;
BEGIN
  SELECT * INTO v_invite
  FROM roll_invites
  WHERE invite_token = p_token
    AND status = 'pending'
    AND method = 'link'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already used'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT json_build_object(
    'id', r.id,
    'title', r.title,
    'description', r.description,
    'title_image_url', r.title_image_url,
    'is_public', r.is_public,
    'creator_id', r.creator_id
  ) INTO v_roll
  FROM rolls r
  WHERE r.id = v_invite.roll_id;

  SELECT json_build_object(
    'id', u.id,
    'username', u.username,
    'display_name', u.display_name,
    'avatar_url', u.avatar_url
  ) INTO v_inviter
  FROM users u
  WHERE u.id = v_invite.inviter_id;

  RETURN json_build_object(
    'invite_id', v_invite.id,
    'roll_id', v_invite.roll_id,
    'roll', v_roll,
    'inviter', v_inviter
  );
END;
$$;

CREATE OR REPLACE FUNCTION decline_roll_invite_by_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE roll_invites
  SET status = 'declined',
      declined_at = NOW()
  WHERE invite_token = p_token
    AND status = 'pending'
    AND method = 'link';
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION get_roll_invite_preview_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION decline_roll_invite_by_token(TEXT) TO anon, authenticated;
