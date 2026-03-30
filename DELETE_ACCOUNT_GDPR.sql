-- GDPR/CCPA: full account deletion (database).
-- Run in Supabase SQL Editor after your core schema exists.
-- Client must also remove Storage objects (see src/services/accountDeletion.js) before calling this RPC.
--
-- Deletes the authenticated user from auth.users. Dependent public rows CASCADE where configured.
-- Explicitly removes contributor-only roll images and profile photos (and their likes/comments)
-- before auth deletion so nothing is left with SET NULL orphans.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Comments/likes on roll photos this user contributed (on others' rolls)
  DELETE FROM public.photo_comments
  WHERE photo_type = 'roll_image'
    AND photo_id IN (SELECT id FROM public.roll_images WHERE contributor_id = uid);

  DELETE FROM public.photo_likes
  WHERE photo_type = 'roll_image'
    AND photo_id IN (SELECT id FROM public.roll_images WHERE contributor_id = uid);

  DELETE FROM public.roll_images WHERE contributor_id = uid;

  -- Profile grid photos (standalone) and interactions
  DELETE FROM public.photo_comments
  WHERE photo_type = 'profile_photo'
    AND photo_id IN (SELECT id FROM public.public_profile_photos WHERE user_id = uid);

  DELETE FROM public.photo_likes
  WHERE photo_type = 'profile_photo'
    AND photo_id IN (SELECT id FROM public.public_profile_photos WHERE user_id = uid);

  DELETE FROM public.public_profile_photos WHERE user_id = uid;

  -- Auth user: cascades public.users, owned rolls, messages, notifications, etc. (per your FKs)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Permanently deletes the current user and related data. Call after Storage cleanup from the app.';
