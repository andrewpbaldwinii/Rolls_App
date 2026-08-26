-- Run in Supabase SQL Editor if tab-badge Realtime fails (CHANNEL_ERROR).
-- Dashboard: Database → Publications → supabase_realtime (or per-table Realtime toggle).

-- If you see: "already member of publication" — that table is already enabled; skip or use blocks below.

-- See what's published (optional):
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add to Realtime only if not already added (safe to re-run).
-- Error 42710 "already member of publication" = table is already enabled; we ignore that.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLSTATE = '42710' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLSTATE = '42710' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

-- Helps postgres_changes for UPDATE/DELETE (optional but recommended).
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
