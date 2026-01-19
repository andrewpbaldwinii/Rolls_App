import { supabase } from '../lib/supabase';

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (user1Id, user2Id) => {
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_user1_id: user1Id,
      p_user2_id: user2Id,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for the current user
 */
export const getConversations = async (userId) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id, last_message_at, created_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    if (!conversations || conversations.length === 0) return [];

    // Get all unique user IDs
    const userIds = new Set();
    conversations.forEach(conv => {
      if (conv.user1_id !== userId) userIds.add(conv.user1_id);
      if (conv.user2_id !== userId) userIds.add(conv.user2_id);
    });

    // Fetch user data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', Array.from(userIds));

    if (usersError) {
      console.warn('Error fetching user data:', usersError);
    }

    // Create user map
    const userMap = new Map();
    if (users) {
      users.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        });
      });
    }

    // Transform conversations with user data
    return conversations.map(conv => {
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
      const otherUser = userMap.get(otherUserId) || {
        id: otherUserId,
        username: null,
        displayName: null,
        avatarUrl: null,
      };

      return {
        id: conv.id,
        otherUser,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
      };
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId, limit = 50, offset = 0) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, message_text, read_at, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    // Get unique sender IDs
    const senderIds = [...new Set(messages.map(m => m.sender_id))];

    // Fetch sender user data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', senderIds);

    if (usersError) {
      console.warn('Error fetching sender user data:', usersError);
    }

    // Create user map
    const userMap = new Map();
    if (users) {
      users.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        });
      });
    }

    // Add sender data to messages
    return messages.reverse().map(msg => ({
      ...msg,
      sender: userMap.get(msg.sender_id) || {
        id: msg.sender_id,
        username: null,
        display_name: null,
        avatar_url: null,
      },
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Send a message
 */
export const sendMessage = async (conversationId, senderId, recipientId, messageText) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        message_text: messageText,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

/**
 * Get conversation with other user info
 */
export const getConversationWithUser = async (userId, otherUserId) => {
  try {
    const conversationId = await getOrCreateConversation(userId, otherUserId);
    
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Fetch other user data
    const { data: otherUserData, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', otherUserId)
      .single();

    if (userError) {
      console.warn('Error fetching other user data:', userError);
    }

    return {
      id: conversation.id,
      otherUser: otherUserData ? {
        id: otherUserData.id,
        username: otherUserData.username,
        displayName: otherUserData.display_name,
        avatarUrl: otherUserData.avatar_url,
      } : {
        id: otherUserId,
        username: null,
        displayName: null,
        avatarUrl: null,
      },
    };
  } catch (error) {
    console.error('Error getting conversation with user:', error);
    throw error;
  }
};
