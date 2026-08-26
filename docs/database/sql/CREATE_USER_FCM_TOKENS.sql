-- FCM device tokens for push (one row per device; user can have multiple).
-- Run in Supabase SQL Editor before using in-app push registration.

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON public.user_fcm_tokens (user_id);

ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own FCM tokens"
  ON public.user_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_fcm_tokens IS 'Firebase Cloud Messaging registration tokens per device; used for server-side pushes.';
