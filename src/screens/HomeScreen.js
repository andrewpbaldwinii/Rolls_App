import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import OptimizedImage from '../components/OptimizedImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getNewsfeedItems, NEWSFEED_ITEM_TYPES } from '../services/newsfeed';
import { useAuth } from '../contexts/AuthContext';
import {
  likePhoto,
  unlikePhoto,
  hasUserLikedPhoto,
  getPhotoLikeCount,
  getPhotoCommentCount,
  getPhotosLikeStatus,
  addComment,
  getPhotoComments,
  PHOTO_TYPES,
} from '../services/interactions';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = SCREEN_WIDTH; // Square images
const ROLL_CARD_INSET = 16;

const HomeScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);
  // Track likes and comments for each item
  const [itemInteractions, setItemInteractions] = useState(new Map());
  // Track which item is showing comment input
  const [commentingItemId, setCommentingItemId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  // Track visible comments for each item (Map<itemId, {comments: [], visibleCount: number}>)
  const [itemComments, setItemComments] = useState(new Map());
  const [loadingComments, setLoadingComments] = useState(new Map());

  const PAGE_SIZE = 20;

  // Load like/comment interactions for items
  const loadInteractions = useCallback(async (itemsToLoad, replace = false) => {
    if (!user) return;

    try {
      const photos = itemsToLoad
        .filter((item) => item.type !== NEWSFEED_ITEM_TYPES.PUBLIC_ROLL)
        .map((item) => ({
          id: item.id,
          type:
            item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO
              ? PHOTO_TYPES.PROFILE_PHOTO
              : PHOTO_TYPES.ROLL_IMAGE,
        }));

      const likeStatusMap = await getPhotosLikeStatus(photos, user.id);

      // Get comment counts
      const commentCounts = await Promise.all(
        photos.map(async (photo) => {
          const count = await getPhotoCommentCount(photo.id, photo.type);
          return { id: photo.id, count };
        })
      );

      // Update interactions state
      setItemInteractions(prev => {
        const newMap = new Map(prev);
        if (replace) {
          newMap.clear();
        }
        itemsToLoad.forEach((item) => {
          if (item.type === NEWSFEED_ITEM_TYPES.PUBLIC_ROLL) return;
          const photoType =
            item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO
              ? PHOTO_TYPES.PROFILE_PHOTO
              : PHOTO_TYPES.ROLL_IMAGE;
          const likeStatus = likeStatusMap.get(item.id) || { liked: false, count: 0 };
          const commentCount = commentCounts.find(c => c.id === item.id)?.count || 0;
          
          newMap.set(item.id, {
            liked: likeStatus.liked,
            likeCount: likeStatus.count,
            commentCount,
            photoType,
          });
        });
        return newMap;
      });
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  }, [user]);

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
        currentUserId: user?.id || null,
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

  // Load interactions when items change
  useEffect(() => {
    if (user && items.length > 0) {
      loadInteractions(items, true);
    }
  }, [items, user, loadInteractions]);

  // Auto-load first comment for items with comments (after interactions are loaded)
  useEffect(() => {
    if (user && items.length > 0 && itemInteractions.size > 0) {
      items.forEach(item => {
        const commentCount = itemInteractions.get(item.id)?.commentCount || 0;
        if (commentCount > 0 && !itemComments.has(item.id)) {
          loadComments(item, true);
        }
      });
    }
  }, [items, user, itemInteractions, itemComments, loadComments]);

  const handleUserPress = useCallback((userId) => {
    if (userId) {
      navigation.navigate('PublicProfile', { userId });
    }
  }, [navigation]);

  const handleImagePress = useCallback((item) => {
    if (item.type === NEWSFEED_ITEM_TYPES.PUBLIC_ROLL && item.rollId) {
      navigation.navigate('RollDetail', { rollId: item.rollId });
    } else if (item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO) {
      navigation.navigate('PhotoViewer', {
        photoId: item.id,
        photoType: PHOTO_TYPES.PROFILE_PHOTO,
        userId: item.userId,
        initialIndex: items.findIndex(i => i.id === item.id),
      });
    }
  }, [navigation, items]);

  // Handle like/unlike
  const handleLike = useCallback(async (item) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like photos');
      return;
    }

    try {
      const photoType = item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO 
        ? PHOTO_TYPES.PROFILE_PHOTO 
        : PHOTO_TYPES.ROLL_IMAGE;
      
      const currentStatus = itemInteractions.get(item.id) || { liked: false, likeCount: 0 };
      
      if (currentStatus.liked) {
        await unlikePhoto(item.id, photoType, user.id);
        // Update local state
        setItemInteractions(prev => {
          const newMap = new Map(prev);
          newMap.set(item.id, {
            ...currentStatus,
            liked: false,
            likeCount: Math.max(0, currentStatus.likeCount - 1),
          });
          return newMap;
        });
      } else {
        await likePhoto(item.id, photoType, user.id);
        // Update local state
        setItemInteractions(prev => {
          const newMap = new Map(prev);
          newMap.set(item.id, {
            ...currentStatus,
            liked: true,
            likeCount: currentStatus.likeCount + 1,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  }, [user, itemInteractions]);

  // Load comments for an item
  const loadComments = useCallback(async (item, initialLoad = false) => {
    const photoType = item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO 
      ? PHOTO_TYPES.PROFILE_PHOTO 
      : PHOTO_TYPES.ROLL_IMAGE;
    
    try {
      setLoadingComments(prev => {
        const newMap = new Map(prev);
        newMap.set(item.id, true);
        return newMap;
      });

      const currentState = itemComments.get(item.id);
      const offset = initialLoad ? 0 : (currentState?.visibleCount || 1);
      const limit = initialLoad ? 1 : 5; // First comment, then 5 at a time

      const comments = await getPhotoComments(item.id, photoType, { limit, offset });

      setItemComments(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(item.id) || { comments: [], visibleCount: 0 };
        
        if (initialLoad) {
          newMap.set(item.id, {
            comments: comments,
            visibleCount: comments.length,
            totalCount: itemInteractions.get(item.id)?.commentCount || 0,
          });
        } else {
          newMap.set(item.id, {
            comments: [...existing.comments, ...comments],
            visibleCount: existing.visibleCount + comments.length,
            totalCount: existing.totalCount || itemInteractions.get(item.id)?.commentCount || 0,
          });
        }
        return newMap;
      });
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(prev => {
        const newMap = new Map(prev);
        newMap.set(item.id, false);
        return newMap;
      });
    }
  }, [itemComments, itemInteractions]);

  // Handle comment button press - toggle inline comment input only
  const handleComment = useCallback((item) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to comment on photos');
      return;
    }

    // Toggle comment input for this item (comments are already visible by default)
    if (commentingItemId === item.id) {
      setCommentingItemId(null);
      setCommentText('');
    } else {
      setCommentingItemId(item.id);
      setCommentText('');
    }
  }, [user, commentingItemId]);

  // Handle comment submit from newsfeed
  const handleCommentSubmit = useCallback(async (item) => {
    if (!user || !commentText.trim()) return;

    if (commentText.trim().length > 500) {
      Alert.alert('Comment Too Long', 'Comments must be 500 characters or less.');
      return;
    }

    try {
      setSubmittingComment(true);
      const photoType = item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO 
        ? PHOTO_TYPES.PROFILE_PHOTO 
        : PHOTO_TYPES.ROLL_IMAGE;
      
      const newComment = await addComment(item.id, photoType, user.id, commentText.trim());
      
      // Update comment count
      setItemInteractions(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(item.id) || { liked: false, likeCount: 0, commentCount: 0 };
        newMap.set(item.id, {
          ...current,
          commentCount: (current.commentCount || 0) + 1,
        });
        return newMap;
      });

      // Add new comment to visible comments
      setItemComments(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(item.id) || { comments: [], visibleCount: 0 };
        newMap.set(item.id, {
          comments: [...existing.comments, newComment],
          visibleCount: existing.visibleCount + 1,
          totalCount: (existing.totalCount || 0) + 1,
        });
        return newMap;
      });

      // Clear input but keep comment section open
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText]);

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
              <OptimizedImage
                source={{ uri: item.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
                showLoadingIndicator={false}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.userText}>
              {item.type === NEWSFEED_ITEM_TYPES.PUBLIC_ROLL ? (
                <View style={styles.rollHeaderRow}>
                  <Text
                    style={[styles.username, styles.rollHeaderUsername]}
                    numberOfLines={1}
                  >
                    {item.displayName || item.username || 'Unknown User'}
                  </Text>
                  <View style={styles.rollKindPill}>
                    <Ionicons name="heart-outline" size={14} color={colors.primary} />
                    <Text style={styles.rollKindPillText}>Shared roll</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.username}>
                  {item.displayName || item.username || 'Unknown User'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {item.type === NEWSFEED_ITEM_TYPES.PUBLIC_ROLL ? (
          <TouchableOpacity
            style={styles.rollCardTouchable}
            activeOpacity={0.92}
            onPress={() => handleImagePress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.rollTitle ? `Open roll ${item.rollTitle}` : 'Open public roll'}
          >
            <View style={styles.rollCardFrame}>
              <View style={styles.rollCardPhotoShell}>
                <View style={styles.rollCardImageWrap}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.rollCardImage}
                      resizeMode="cover"
                      onError={(e) => console.error('Roll title image error:', e)}
                    />
                  ) : (
                    <View style={[styles.rollCardImage, styles.rollCardImageFallback]} />
                  )}
                </View>
                <View style={styles.rollCardScrim} pointerEvents="none" />
              </View>
              <View style={styles.rollCardPolaroidFooter} pointerEvents="none">
                <View style={styles.rollCardOverlayRow}>
                  <View style={styles.rollCardTextCol}>
                    <Text style={styles.rollCardPolaroidTitle} numberOfLines={2}>
                      {item.rollTitle || 'Untitled roll'}
                    </Text>
                    {item.createdAt ? (
                      <Text style={styles.rollCardPolaroidMeta} numberOfLines={1}>
                        {formatTimestamp(item.createdAt)}
                      </Text>
                    ) : null}
                    {item.rollCaption ? (
                      <Text style={styles.rollCardPolaroidCaption} numberOfLines={3}>
                        {item.rollCaption}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rollCardHintPill}>
                    <Text style={styles.rollCardHint}>Take a look</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
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
        )}

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

        {/* Like/comment only for profile photos (public roll card uses synthetic id, not a photo row) */}
        {item.type !== NEWSFEED_ITEM_TYPES.PUBLIC_ROLL && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={itemInteractions.get(item.id)?.liked ? 'heart' : 'heart-outline'}
              size={24}
              color={itemInteractions.get(item.id)?.liked ? colors.error : colors.textPrimary}
            />
            {(itemInteractions.get(item.id)?.likeCount || 0) > 0 && (
              <Text style={styles.actionCount}>
                {itemInteractions.get(item.id)?.likeCount || 0}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleComment(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={commentingItemId === item.id ? 'chatbubble' : 'chatbubble-outline'}
              size={24}
              color={commentingItemId === item.id ? colors.primary : colors.textPrimary}
            />
            {(itemInteractions.get(item.id)?.commentCount || 0) > 0 && (
              <Text style={styles.actionCount}>
                {itemInteractions.get(item.id)?.commentCount || 0}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        )}

        {/* Comments Display */}
        {item.type !== NEWSFEED_ITEM_TYPES.PUBLIC_ROLL && itemComments.has(item.id) && itemComments.get(item.id).comments.length > 0 && (
          <View style={styles.commentsDisplayContainer}>
            {itemComments.get(item.id).comments.map((comment) => (
              <View key={comment.id} style={styles.commentDisplayItem}>
                <TouchableOpacity
                  onPress={() => {
                    if (comment.user_id) {
                      navigation.navigate('PublicProfile', { userId: comment.user_id });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.commentDisplayUsername}>
                    {comment.user?.display_name || comment.user?.username || 'Unknown'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.commentDisplayText}>{comment.comment_text}</Text>
              </View>
            ))}
            
            {/* View More Button */}
            {(() => {
              const commentState = itemComments.get(item.id);
              const totalCount = commentState?.totalCount || itemInteractions.get(item.id)?.commentCount || 0;
              const visibleCount = commentState?.visibleCount || 0;
              const hasMore = totalCount > visibleCount;
              
              if (hasMore && !loadingComments.get(item.id)) {
                return (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => loadComments(item, false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMoreText}>
                      View more comments ({totalCount - visibleCount} remaining)
                    </Text>
                  </TouchableOpacity>
                );
              } else if (loadingComments.get(item.id)) {
                return (
                  <View style={styles.viewMoreButton}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                );
              }
              return null;
            })()}
          </View>
        )}

        {/* Inline Comment Input */}
        {item.type !== NEWSFEED_ITEM_TYPES.PUBLIC_ROLL && commentingItemId === item.id && user && (
          <View style={styles.commentInputSection}>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentText.trim() || submittingComment || commentText.length > 500) && styles.sendButtonDisabled
                ]}
                onPress={() => handleCommentSubmit(item)}
                disabled={!commentText.trim() || submittingComment || commentText.length > 500}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Ionicons name="send" size={20} color={colors.buttonText} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.characterCount}>
              {commentText.length}/500
            </Text>
          </View>
        )}

        {/* Timestamp (public roll shows date on card overlay instead) */}
        {item.type !== NEWSFEED_ITEM_TYPES.PUBLIC_ROLL && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    handleUserPress,
    handleImagePress,
    handleLike,
    handleComment,
    handleCommentSubmit,
    loadComments,
    itemInteractions,
    itemComments,
    loadingComments,
    commentingItemId,
    commentText,
    submittingComment,
    user,
    navigation,
    styles,
    colors,
  ]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, styles, colors]);

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
  }, [loading, styles, colors]);

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Newsfeed</Text>
      </View>

      {/* Feed */}
      <FlatList
        style={styles.feedList}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        extraData={isDark}
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

const createStyles = (colors, isDark) => StyleSheet.create({
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
  feedList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
  rollHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rollHeaderUsername: {
    flexShrink: 1,
    marginRight: 10,
  },
  rollKindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: isDark
      ? 'rgba(94, 200, 191, 0.12)'
      : 'rgba(59, 184, 173, 0.10)',
    borderWidth: 1,
    borderColor: isDark
      ? 'rgba(94, 200, 191, 0.22)'
      : 'rgba(59, 184, 173, 0.20)',
  },
  rollKindPillText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  rollCardTouchable: {
    marginHorizontal: ROLL_CARD_INSET,
    marginBottom: 6,
  },
  rollCardFrame: {
    borderRadius: 10,
    backgroundColor: isDark ? '#3D3C3A' : '#EFEDE8',
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.45 : 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  rollCardPhotoShell: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: isDark ? '#1C1C1E' : '#E0DDD8',
  },
  rollCardImageWrap: {
    width: '100%',
    aspectRatio: 1,
  },
  rollCardImage: {
    width: '100%',
    height: '100%',
  },
  rollCardImageFallback: {
    backgroundColor: colors.inputBackground,
  },
  rollCardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: isDark
      ? 'rgba(0, 0, 0, 0.22)'
      : 'rgba(30, 28, 26, 0.12)',
  },
  rollCardPolaroidFooter: {
    paddingTop: 12,
    marginTop: 2,
  },
  rollCardOverlayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rollCardTextCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  rollCardPolaroidTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: isDark ? '#F5F3EF' : '#1A1A1A',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  rollCardPolaroidMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: isDark ? 'rgba(245, 243, 239, 0.55)' : 'rgba(0, 0, 0, 0.45)',
  },
  rollCardPolaroidCaption: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: isDark ? 'rgba(245, 243, 239, 0.85)' : 'rgba(0, 0, 0, 0.72)',
  },
  rollCardHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: isDark
      ? 'rgba(59, 184, 173, 0.14)'
      : 'rgba(59, 184, 173, 0.12)',
    borderWidth: 1,
    borderColor: isDark
      ? 'rgba(94, 200, 191, 0.35)'
      : 'rgba(59, 184, 173, 0.35)',
  },
  rollCardHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 6,
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
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  commentInputSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.background,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
    minHeight: 40,
    marginRight: 8,
  },
  characterCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    paddingRight: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsDisplayContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  commentDisplayItem: {
    marginBottom: 12,
  },
  commentDisplayUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  commentDisplayText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  viewMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
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

