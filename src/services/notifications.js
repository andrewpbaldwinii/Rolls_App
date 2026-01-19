import { supabase } from '../lib/supabase';

/**
 * Get notifications for the current user
 */
export const getNotifications = async (userId, limit = 50, offset = 0) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, related_user_id, related_message_id, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!notifications || notifications.length === 0) return [];

    // Get unique related user IDs
    const relatedUserIds = notifications
      .map(n => n.related_user_id)
      .filter(id => id !== null);

    // Fetch related user data if there are any
    let userMap = new Map();
    if (relatedUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', relatedUserIds);

      if (usersError) {
        console.warn('Error fetching related user data:', usersError);
      } else if (users) {
        users.forEach(user => {
          userMap.set(user.id, {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
          });
        });
      }
    }

    // Add related user data to notifications
    return notifications.map(notification => ({
      ...notification,
      related_user: notification.related_user_id 
        ? (userMap.get(notification.related_user_id) || {
            id: notification.related_user_id,
            username: null,
            display_name: null,
            avatar_url: null,
          })
        : null,
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};
