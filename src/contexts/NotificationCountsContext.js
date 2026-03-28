import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { getUnreadNotificationCount } from '../services/notifications';
import { getUnreadMessageCount } from '../services/messaging';

const NotificationCountsContext = createContext({
  unreadNotificationCount: 0,
  unreadMessageCount: 0,
  refreshNotificationCounts: async () => {},
  showInboxMessageIndicator: false,
  dismissInboxMessageIndicator: () => {},
});

export const NotificationCountsProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  /** After user opens Inbox, hide mailbox ! until unread count increases (new messages). */
  const [inboxIndicatorSuppressed, setInboxIndicatorSuppressed] = useState(false);
  const prevUnreadMessageCountRef = useRef(0);

  const refreshNotificationCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      return;
    }
    try {
      const [n, m] = await Promise.all([
        getUnreadNotificationCount(user.id),
        getUnreadMessageCount(user.id),
      ]);
      setUnreadNotificationCount(n ?? 0);
      setUnreadMessageCount(m ?? 0);
    } catch (e) {
      console.warn('Notification counts refresh failed:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshNotificationCounts();
  }, [refreshNotificationCounts]);

  /** Foreground refresh (helps if Realtime missed an event). */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user?.id) {
        refreshNotificationCounts();
      }
    });
    return () => sub.remove();
  }, [user?.id, refreshNotificationCounts]);

  /**
   * Live updates for tab badge + inbox counts when new notifications/messages arrive.
   * Enable in Supabase: Database → Publications → supabase_realtime, or Table editor → Realtime for `notifications` and `messages`.
   */
  useEffect(() => {
    if (!user?.id) return undefined;

    const uid = user.id;
    const channel = supabase
      .channel(`notification-counts:${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        },
        () => {
          refreshNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${uid}`,
        },
        () => {
          refreshNotificationCounts();
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && __DEV__) {
          console.warn(
            '[NotificationCounts] Realtime subscription error — enable Realtime for public.notifications and public.messages in Supabase:',
            err?.message || err
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshNotificationCounts]);

  useEffect(() => {
    if (!user?.id) {
      setInboxIndicatorSuppressed(false);
      prevUnreadMessageCountRef.current = 0;
      return;
    }
    const prev = prevUnreadMessageCountRef.current;
    if (unreadMessageCount > prev) {
      setInboxIndicatorSuppressed(false);
    }
    prevUnreadMessageCountRef.current = unreadMessageCount;
  }, [user?.id, unreadMessageCount]);

  const dismissInboxMessageIndicator = useCallback(() => {
    setInboxIndicatorSuppressed(true);
  }, []);

  const showInboxMessageIndicator =
    unreadMessageCount > 0 && !inboxIndicatorSuppressed;

  const value = useMemo(
    () => ({
      unreadNotificationCount,
      unreadMessageCount,
      refreshNotificationCounts,
      showInboxMessageIndicator,
      dismissInboxMessageIndicator,
    }),
    [
      unreadNotificationCount,
      unreadMessageCount,
      refreshNotificationCounts,
      showInboxMessageIndicator,
      dismissInboxMessageIndicator,
    ]
  );

  return (
    <NotificationCountsContext.Provider value={value}>
      {children}
    </NotificationCountsContext.Provider>
  );
};

export const useNotificationCounts = () => useContext(NotificationCountsContext);
