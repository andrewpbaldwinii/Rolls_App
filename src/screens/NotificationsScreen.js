import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, getUnreadNotificationCount } from '../services/notifications';
import { getUnreadMessageCount } from '../services/messaging';
import { acceptRollInvite, getPendingInvites } from '../services/rollInvites';
import { useRolls } from '../contexts/RollsContext';
import colors from '../constants/colors';

const NotificationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fetchRolls } = useRolls();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [acceptingInviteId, setAcceptingInviteId] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await getNotifications(user.id);
      setNotifications(data);
      
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
      
      const messageCount = await getUnreadMessageCount(user.id);
      setUnreadMessageCount(messageCount);
      
      // Load pending invites to show accept/decline buttons
      // Only load if there are roll_invite notifications to avoid unnecessary calls
      const hasRollInvites = data.some(n => n.type === 'roll_invite');
      if (hasRollInvites) {
        try {
          const invites = await getPendingInvites();
          setPendingInvites(invites || []);
        } catch (err) {
          console.warn('Error loading pending invites:', err);
          setPendingInvites([]);
        }
      } else {
        setPendingInvites([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleInboxPress = () => {
    navigation.navigate('Inbox');
  };

  const handleAcceptInvite = async (notification) => {
    if (!notification.related_roll_id) return;
    
    // Find the invite ID from pending invites
    const invite = pendingInvites.find(inv => inv.roll_id === notification.related_roll_id);
    if (!invite) {
      Alert.alert('Error', 'Invite not found. Please try navigating to the roll and accepting from there.');
      return;
    }
    
    setAcceptingInviteId(invite.id);
    try {
      console.log('📥 Accepting roll invite:', invite.id);
      await acceptRollInvite(invite.id);
      
      // Refresh everything
      await fetchRolls();
      await loadNotifications();
      
      Alert.alert('Success', 'You have been added as a contributor to this roll!');
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', error.message || 'Failed to accept invite. Please try again.');
    } finally {
      setAcceptingInviteId(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderNotification = ({ item }) => {
    const isUnread = !item.read_at;
    const isRollInvite = item.type === 'roll_invite';
    const pendingInvite = isRollInvite ? pendingInvites.find(inv => inv.roll_id === item.related_roll_id) : null;
    const isAccepting = acceptingInviteId === pendingInvite?.id;
    
    return (
      <View
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
        ]}
      >
        <TouchableOpacity
          style={styles.notificationContentWrapper}
          activeOpacity={0.7}
          onPress={() => {
            // Handle notification tap based on type
            if (item.type === 'message' && item.related_user_id) {
              navigation.navigate('Message', {
                userId: item.related_user_id,
              });
            } else if (item.type === 'roll_invite' && item.related_roll_id) {
              // Navigate to roll detail screen
              navigation.navigate('RollDetail', {
                rollId: item.related_roll_id,
              });
            }
          }}
        >
          <View style={styles.notificationIcon}>
            {item.type === 'message' && (
              <Ionicons name="mail" size={24} color={colors.primary} />
            )}
            {item.type === 'like' && (
              <Ionicons name="heart" size={24} color={colors.error} />
            )}
            {item.type === 'comment' && (
              <Ionicons name="chatbubble" size={24} color={colors.primary} />
            )}
            {item.type === 'follow' && (
              <Ionicons name="person-add" size={24} color={colors.primary} />
            )}
            {item.type === 'roll_invite' && (
              <Ionicons name="mail-open" size={24} color={colors.primary} />
            )}
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {item.body && (
              <Text style={styles.notificationBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text style={styles.notificationTime}>
              {formatTimestamp(item.created_at)}
            </Text>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
        
        {/* Accept/Decline buttons for roll invites */}
        {isRollInvite && pendingInvite && (
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
              onPress={() => handleAcceptInvite(item)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={colors.buttonText} />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => {
                // Navigate to roll detail where they can decline
                navigation.navigate('RollDetail', {
                  rollId: item.related_roll_id,
                });
              }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.inboxButton}
          onPress={handleInboxPress}
          activeOpacity={0.7}
        >
          <Ionicons name="mail" size={24} color={colors.textWhite} />
          {unreadMessageCount > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You'll see alerts for invites, comments, likes, and more here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.navBackground,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    flex: 1,
  },
  inboxButton: {
    padding: 8,
    position: 'relative',
  },
  inboxBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inboxBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    backgroundColor: colors.background,
  },
  notificationContentWrapper: {
    flexDirection: 'row',
  },
  notificationItemUnread: {
    backgroundColor: colors.inputBackground,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    marginLeft: 8,
  },
  inviteActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationsScreen;

