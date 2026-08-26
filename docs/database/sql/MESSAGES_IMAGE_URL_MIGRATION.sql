-- Add optional image attachment URL to messages (run in Supabase SQL Editor)
-- Requires existing CREATE_MESSAGING_TABLES.sql / messages table

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Notification body: show a sensible preview for photo-only messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, related_user_id, related_message_id)
  VALUES (
    NEW.recipient_id,
    'message',
    'New message',
    CASE
      WHEN NEW.image_url IS NOT NULL AND (NEW.message_text IS NULL OR TRIM(NEW.message_text) = '') THEN
        'Sent a photo'
      ELSE LEFT(COALESCE(NEW.message_text, ''), 100)
    END,
    NEW.sender_id,
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
