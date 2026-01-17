import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getNewsfeedItems, NEWSFEED_ITEM_TYPES } from '../services/newsfeed';
import colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = SCREEN_WIDTH; // Square images

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);

  const PAGE_SIZE = 20;

  const loadNewsfeed = useCallback(async (page = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else if (page === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      console.log(`📰 Loading newsfeed page ${page}...`);
      const result = await getNewsfeedItems({
        page,
        pageSize: PAGE_SIZE,
      });

      console.log(`✅ Newsfeed loaded: ${result.items.length} items, hasMore: ${result.hasMore}, total: ${result.totalCount}`);

      if (isRefresh || page === 0) {
        setItems(result.items);
        console.log(`📱 Set ${result.items.length} items to feed`);
      } else {
        setItems(prev => {
          const newItems = [...prev, ...result.items];
          console.log(`📱 Added ${result.items.length} items, total now: ${newItems.length}`);
          return newItems;
        });
      }

      setHasMore(result.hasMore);
      setCurrentPage(page);
      
      if (result.items.length === 0 && page === 0) {
        console.warn('⚠️ No items found in newsfeed. Check console for query details.');
      }
    } catch (err) {
      console.error('❌ Error loading newsfeed:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
      });
      setError(err.message || 'Failed to load newsfeed');
      if (page === 0) {
        Alert.alert(
          'Error Loading Newsfeed',
          err.message || 'Failed to load newsfeed. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadNewsfeed(0);
  }, [loadNewsfeed]);

  const handleRefresh = useCallback(() => {
    loadNewsfeed(0, true);
  }, [loadNewsfeed]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadNewsfeed(currentPage + 1);
    }
  }, [loadingMore, hasMore, loading, currentPage, loadNewsfeed]);

  const handleUserPress = useCallback((userId) => {
    if (userId) {
      navigation.navigate('PublicProfile', { userId });
    }
  }, [navigation]);

  const handleImagePress = useCallback((item) => {
    if (item.type === NEWSFEED_ITEM_TYPES.ROLL_IMAGE && item.rollId) {
      navigation.navigate('RollDetail', { rollId: item.rollId });
    }
  }, [navigation]);

  const renderItem = useCallback(({ item, index }) => {
    return (
      <View style={styles.feedItem}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => handleUserPress(item.userId)}
            activeOpacity={0.7}
          >
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.userText}>
              <Text style={styles.username}>
                {item.displayName || item.username || 'Unknown User'}
              </Text>
              {item.type === NEWSFEED_ITEM_TYPES.ROLL_IMAGE && item.rollTitle && (
                <Text style={styles.rollTitle} numberOfLines={1}>
                  {item.rollTitle}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Image */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleImagePress(item)}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.feedImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image load error:', error);
            }}
          />
        </TouchableOpacity>

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={3}>
              <Text style={styles.captionUsername}>
                {item.displayName || item.username || 'Unknown'}
              </Text>
              {' '}
              {item.caption}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <View style={styles.timestampContainer}>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  }, [handleUserPress, handleImagePress]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>
          Public photos and developed rolls will appear here
        </Text>
      </View>
    );
  }, [loading]);

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Newsfeed</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading newsfeed...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Newsfeed</Text>
      </View>

      {/* Feed */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "3 days ago")
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listContent: {
    paddingBottom: 20,
  },
  feedItem: {
    backgroundColor: colors.background,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rollTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedImage: {
    width: ITEM_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.inputBackground,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  caption: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestampContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default HomeScreen;

