import { supabase } from '../lib/supabase';

/**
 * Get notifications for the current user
 */
export const getNotifications = async (userId, limit = 50, offset = 0) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, related_user_id, related_message_id, related_roll_id, read_at, created_at')
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
 * Mark every unread "message" notification from a given sender (e.g. after opening the thread).
 */
export const markAllUnreadMessageNotificationsForSender = async (
  userId,
  senderUserId
) => {
  if (!userId || !senderUserId) return;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('type', 'message')
      .eq('related_user_id', senderUserId)
      .is('read_at', null);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking message notifications read:', error);
    throw error;
  }
};

/**
 * Group message notifications by sender for the notifications list (newest activity first).
 */
export const groupNotificationsForDisplay = (notifications) => {
  if (!notifications?.length) return [];

  const messageByUser = new Map();
  const singles = [];

  for (const n of notifications) {
    if (n.type === 'message' && n.related_user_id) {
      const uid = n.related_user_id;
      if (!messageByUser.has(uid)) messageByUser.set(uid, []);
      messageByUser.get(uid).push(n);
    } else {
      singles.push({
        kind: 'single',
        notification: n,
        sortKey: new Date(n.created_at).getTime(),
      });
    }
  }

  const groups = [];
  for (const [, msgs] of messageByUser) {
    msgs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const unreadCount = msgs.filter((m) => !m.read_at).length;
    // Hide message rows once everything for this sender has been read (e.g. after opening chat).
    if (unreadCount === 0) {
      continue;
    }
    const latest = msgs[0];
    groups.push({
      kind: 'message_group',
      relatedUserId: latest.related_user_id,
      count: msgs.length,
      unreadCount,
      latestAt: latest.created_at,
      notificationIds: msgs.map((m) => m.id),
      related_user: latest.related_user,
      previewBody: latest.body,
      sortKey: new Date(latest.created_at).getTime(),
    });
  }

  const singlesFiltered = singles.filter((s) => {
    const n = s.notification;
    if (n.type === 'message' && n.read_at) {
      return false;
    }
    return true;
  });

  const merged = [...groups, ...singlesFiltered];
  merged.sort((a, b) => b.sortKey - a.sortKey);
  return merged;
};

/**
 * Mark multiple notifications read (e.g. grouped message rows).
 */
export const markNotificationsAsReadByIds = async (userId, notificationIds) => {
  if (!userId || !notificationIds?.length) return;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notifications read:', error);
    throw error;
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
