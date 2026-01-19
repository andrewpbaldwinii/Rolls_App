# Messaging and Notifications Setup

This guide will help you set up the messaging and notifications system for the Rolls app.

## Database Setup

1. **Run the SQL Script**
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `CREATE_MESSAGING_TABLES.sql`
   - Click "Run" to execute the script
   - This will create:
     - `conversations` table (one conversation between two users)
     - `messages` table (individual messages)
     - `notifications` table (notifications for messages, likes, comments, etc.)
     - Indexes for performance
     - RLS (Row Level Security) policies
     - Triggers for automatic notification creation

## Features

### Notifications Screen
- **Header**: Shows "Notifications" title with an inbox button
- **Inbox Button**: Tap to view all your messages (shows unread count badge)
- **Notifications List**: Displays all notifications (messages, likes, comments, follows)
- **Pull to Refresh**: Swipe down to refresh notifications

### Inbox Screen
- **Conversations List**: Shows all conversations with other users
- **User Info**: Displays username/display name and avatar
- **Last Message Time**: Shows when the last message was sent
- **Unread Badge**: Shows count of unread messages in header
- **Tap Conversation**: Opens the message screen

### Message Screen
- **Chat Interface**: Full conversation view with message bubbles
- **Send Messages**: Type and send messages to the other user
- **Read Receipts**: Messages are automatically marked as read when viewed
- **Real-time Updates**: Messages appear immediately after sending

### Public Profile Screen
- **Message Button**: New button next to "Follow" button
- **Initiate Messaging**: Tap to start a conversation with that user
- **Auto-create Conversation**: Creates conversation automatically if it doesn't exist

## Flow

1. **User A** visits **User B's** public profile
2. **User A** taps the "Message" button
3. System creates/gets conversation between User A and User B
4. **User A** sends a message
5. **User B** receives a notification in their Notifications tab
6. **User B** taps the inbox button to see the message
7. **User B** opens the conversation and replies
8. Messages appear in both users' inboxes

## Database Functions

The SQL script creates several helpful functions:

- `get_or_create_conversation()`: Ensures consistent conversation IDs between two users
- `create_message_notification()`: Automatically creates notifications when messages are sent
- `update_conversation_timestamp()`: Updates conversation's last message timestamp

## RLS Policies

All tables have Row Level Security enabled:
- Users can only view their own conversations and messages
- Users can only send messages (not modify others')
- Users can only view their own notifications

## Troubleshooting

### Messages not appearing
- Check that the SQL script ran successfully
- Verify RLS policies are enabled
- Check browser console for errors

### Notifications not showing
- Ensure the trigger `trigger_create_message_notification` exists
- Check that notifications table has proper RLS policies

### Conversation not creating
- Verify the `get_or_create_conversation` function exists
- Check that both users exist in `auth.users` table

## Next Steps

After running the SQL script:
1. Restart your app
2. Test messaging between two users
3. Check that notifications appear correctly
4. Verify inbox shows conversations properly
