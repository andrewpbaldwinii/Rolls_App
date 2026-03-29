-- When a roll's status becomes "developed" (photos available after develop/release date),
-- notify every user in roll_contributors (including the owner) with an in-app notification
-- that links to the roll (related_roll_id).
--
-- Run in Supabase SQL Editor after notifications + roll_contributors exist.
-- Requires: notifications.related_roll_id (see CREATE_ROLL_INVITES_TABLE.sql).

CREATE OR REPLACE FUNCTION public.notify_contributors_on_roll_developed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, related_user_id, related_roll_id)
  SELECT
    rc.user_id,
    'roll_developed',
    'Roll is ready: ' || COALESCE(NEW.title, 'Untitled'),
    'Photos in this roll are now available for everyone to view.',
    NEW.creator_id,
    NEW.id
  FROM public.roll_contributors rc
  WHERE rc.roll_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rolls_notify_developed ON public.rolls;

CREATE TRIGGER rolls_notify_developed
  AFTER UPDATE OF status ON public.rolls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'developed')
  EXECUTE FUNCTION public.notify_contributors_on_roll_developed();

COMMENT ON FUNCTION public.notify_contributors_on_roll_developed() IS
  'Inserts roll_developed notifications for all contributors when status becomes developed.';
