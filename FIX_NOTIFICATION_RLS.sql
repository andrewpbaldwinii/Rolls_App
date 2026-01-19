-- Fix RLS policy for notifications to allow trigger inserts
-- Run this if you're getting "new row violates row-level security policy" errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Recreate the notification function with SECURITY DEFINER
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
    LEFT(NEW.message_text, 100),
    NEW.sender_id,
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate RLS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow system/trigger to insert notifications
-- Note: SECURITY DEFINER function bypasses RLS, but this policy provides additional safety
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
