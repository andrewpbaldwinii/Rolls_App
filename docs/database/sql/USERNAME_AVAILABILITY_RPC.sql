-- =============================================================================
-- Username availability (secure + scalable)
-- Run in Supabase SQL Editor (once per project).
--
-- 1) Unique index so duplicates cannot be inserted at scale (O(log n) checks).
-- 2) SECURITY DEFINER RPC so anon/authenticated callers need no SELECT on users.
-- =============================================================================

-- Unique username (case-sensitive), NULLs allowed for legacy rows; empty string disallowed by index predicate
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
  ON public.users (username)
  WHERE username IS NOT NULL AND btrim(username) <> '';

-- Returns TRUE if no row owns this username (trimmed, exact case match with app rules).
-- p_exclude_user_id: pass current user when renaming (edit profile); NULL at signup.
CREATE OR REPLACE FUNCTION public.is_username_available(
  p_username text,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.username IS NOT NULL
      AND btrim(u.username) = btrim(p_username)
      AND (p_exclude_user_id IS NULL OR u.id <> p_exclude_user_id)
  );
$$;

COMMENT ON FUNCTION public.is_username_available(text, uuid) IS
  'True if username is not taken. Uses SECURITY DEFINER to avoid exposing users table via anon SELECT.';

-- PostgREST: callable from the JS client
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO authenticated;

-- If CREATE UNIQUE INDEX fails with "duplicate key", fix duplicate usernames first, then re-run the index line.
