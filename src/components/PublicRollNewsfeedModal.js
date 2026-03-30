import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import OptimizedImage from './OptimizedImage';
import {
  likePhoto,
  unlikePhoto,
  addComment,
  getPhotoComments,
  PHOTO_TYPES,
} from '../services/interactions';
import { getRollPhotosForNewsfeedModal } from '../services/newsfeed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const GRID_PADDING = 20;
const IMAGE_SIZE =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

/**
 * Full-screen modal: same layout as Roll detail — Photos grid + vertical Contributions feed.
 */
const PublicRollNewsfeedModal = ({
  visible,
  onClose,
  rollId,
  rollTitle,
  colors,
  user,
  onOpenRollDetail,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [showAllImages, setShowAllImages] = useState(false);
  const [visibleImageIndices, setVisibleImageIndices] = useState(
    () => new Set([0, 1, 2, 3, 4, 5]),
  );

  const [feedInteractions, setFeedInteractions] = useState(() => new Map());
  const [feedCommentingItemId, setFeedCommentingItemId] = useState(null);
  const [feedCommentText, setFeedCommentText] = useState('');
  const [feedSubmittingComment, setFeedSubmittingComment] = useState(false);
  const [feedItemComments, setFeedItemComments] = useState(() => new Map());
  const [feedLoadingComments, setFeedLoadingComments] = useState(() => new Map());

  const gridData = useMemo(
    () => (showAllImages ? photos : photos.slice(0, 6)),
    [photos, showAllImages],
  );

  const formatTimestamp = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
      const m = Math.floor(diffInSeconds / 60);
      return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffInSeconds < 86400) {
      const h = Math.floor(diffInSeconds / 3600);
      return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffInSeconds < 604800) {
      const d = Math.floor(diffInSeconds / 86400);
      return `${d} ${d === 1 ? 'day' : 'days'} ago`;
    }
    return date.toLocaleDateString();
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!rollId || !visible) return;
    setLoading(true);
    try {
      const data = await getRollPhotosForNewsfeedModal(rollId, user?.id || null);
      setPhotos(data);
      const m = new Map();
      data.forEach((p) =>
        m.set(p.id, {
          liked: p.liked,
          likeCount: p.likeCount || 0,
          commentCount: p.commentCount || 0,
        }),
      );
      setFeedInteractions(m);
      setVisibleImageIndices(
        new Set(Array.from({ length: Math.min(6, data.length) }, (_, i) => i)),
      );
      setShowAllImages(false);
      setFeedItemComments(new Map());
      setFeedLoadingComments(new Map());
      setFeedCommentingItemId(null);
      setFeedCommentText('');
    } catch (e) {
      console.error('PublicRollNewsfeedModal loadPhotos', e);
      Alert.alert('Error', 'Could not load roll photos.');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [rollId, visible, user?.id]);

  useEffect(() => {
    if (visible && rollId) {
      loadPhotos();
    } else if (!visible) {
      setPhotos([]);
      setFeedInteractions(new Map());
      setFeedItemComments(new Map());
      setFeedLoadingComments(new Map());
      setFeedCommentingItemId(null);
      setFeedCommentText('');
      setVisibleImageIndices(new Set([0, 1, 2, 3, 4, 5]));
      setShowAllImages(false);
    }
  }, [visible, rollId, loadPhotos]);

  const handleFeedLike = useCallback(
    async (item) => {
      if (!user) {
        Alert.alert('Login Required', 'Please log in to like photos');
        return;
      }

      const currentStatus =
        feedInteractions.get(item.id) || { liked: false, likeCount: 0, commentCount: 0 };

      try {
        if (currentStatus.liked) {
          await unlikePhoto(item.id, PHOTO_TYPES.ROLL_IMAGE, user.id);
          setFeedInteractions((prev) => {
            const next = new Map(prev);
            next.set(item.id, {
              ...currentStatus,
              liked: false,
              likeCount: Math.max(0, currentStatus.likeCount - 1),
            });
            return next;
          });
        } else {
          await likePhoto(item.id, PHOTO_TYPES.ROLL_IMAGE, user.id);
          setFeedInteractions((prev) => {
            const next = new Map(prev);
            next.set(item.id, {
              ...currentStatus,
              liked: true,
              likeCount: (currentStatus.likeCount || 0) + 1,
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Error toggling like:', error);
        Alert.alert('Error', error.message || 'Failed to like photo. Please try again.');
      }
    },
    [user, feedInteractions],
  );

  const loadFeedComments = useCallback(
    async (item, initialLoad = false) => {
      if (feedLoadingComments.get(item.id)) return;

      setFeedLoadingComments((prev) => {
        const next = new Map(prev);
        next.set(item.id, true);
        return next;
      });

      try {
        const existing = feedItemComments.get(item.id);
        const offset = initialLoad ? 0 : (existing?.comments.length || 0);
        const limit = initialLoad ? 10 : 20;

        const comments = await getPhotoComments(item.id, PHOTO_TYPES.ROLL_IMAGE, { limit, offset });

        setFeedItemComments((prev) => {
          const next = new Map(prev);
          const prevEntry = next.get(item.id) || { comments: [], visibleCount: 0 };

          if (initialLoad) {
            next.set(item.id, {
              comments,
              visibleCount: comments.length,
              totalCount: feedInteractions.get(item.id)?.commentCount || 0,
            });
          } else {
            next.set(item.id, {
              comments: [...prevEntry.comments, ...comments],
              visibleCount: prevEntry.visibleCount + comments.length,
              totalCount:
                prevEntry.totalCount || feedInteractions.get(item.id)?.commentCount || 0,
            });
          }
          return next;
        });
      } catch (error) {
        console.error('Error loading feed comments:', error);
      } finally {
        setFeedLoadingComments((prev) => {
          const next = new Map(prev);
          next.set(item.id, false);
          return next;
        });
      }
    },
    [feedItemComments, feedInteractions, feedLoadingComments],
  );

  const handleFeedComment = useCallback(
    (item) => {
      if (!user) {
        Alert.alert('Login Required', 'Please log in to comment on photos');
        return;
      }

      if (feedCommentingItemId === item.id) {
        setFeedCommentingItemId(null);
        setFeedCommentText('');
      } else {
        setFeedCommentingItemId(item.id);
        setFeedCommentText('');
        if (!feedItemComments.has(item.id)) {
          loadFeedComments(item, true);
        }
      }
    },
    [user, feedCommentingItemId, feedItemComments, loadFeedComments],
  );

  const handleFeedCommentSubmit = useCallback(
    async (item) => {
      if (!user || !feedCommentText.trim()) return;

      if (feedCommentText.trim().length > 500) {
        Alert.alert('Comment Too Long', 'Comments must be 500 characters or less.');
        return;
      }

      try {
        setFeedSubmittingComment(true);
        const newComment = await addComment(
          item.id,
          PHOTO_TYPES.ROLL_IMAGE,
          user.id,
          feedCommentText.trim(),
        );

        setFeedInteractions((prev) => {
          const next = new Map(prev);
          const current = next.get(item.id) || { liked: false, likeCount: 0, commentCount: 0 };
          next.set(item.id, {
            ...current,
            commentCount: (current.commentCount || 0) + 1,
          });
          return next;
        });

        setFeedItemComments((prev) => {
          const next = new Map(prev);
          const existing = next.get(item.id) || { comments: [], visibleCount: 0, totalCount: 0 };
          next.set(item.id, {
            comments: [...existing.comments, newComment],
            visibleCount: existing.visibleCount + 1,
            totalCount: (existing.totalCount || 0) + 1,
          });
          return next;
        });

        setFeedCommentText('');
      } catch (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', error.message || 'Failed to add comment. Please try again.');
      } finally {
        setFeedSubmittingComment(false);
      }
    },
    [user, feedCommentText],
  );

  const renderImageItem = useCallback(
    ({ item, index }) => {
      const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
      const shouldLoadImage = visibleImageIndices.has(index);

      const wrapperStyle = [
        styles.imageWrapper,
        {
          marginRight: isLastInRow ? 0 : GRID_GAP,
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
        },
      ];

      const openViewer = () =>
        navigation.navigate('PhotoViewer', {
          photoId: item.id,
          photoType: PHOTO_TYPES.ROLL_IMAGE,
          rollId,
          initialIndex: photos.findIndex((p) => p.id === item.id),
        });

      return (
        <View style={wrapperStyle}>
          {shouldLoadImage ? (
            <TouchableOpacity style={styles.imageContainer} activeOpacity={0.9} onPress={openViewer}>
              <OptimizedImage
                source={{
                  uri: item.imageUrl,
                  width: IMAGE_SIZE,
                  height: IMAGE_SIZE,
                }}
                style={styles.image}
                resizeMethod="resize"
                resizeMode="cover"
                onError={() => {
                  setVisibleImageIndices((prev) => {
                    const next = new Set(prev);
                    next.delete(index);
                    return next;
                  });
                }}
                onLoad={() => {
                  const visibleArray = Array.from(visibleImageIndices);
                  if (visibleArray.length > 0) {
                    const maxVisible = Math.max(...visibleArray);
                    if (index === maxVisible && index < photos.length - 1) {
                      setTimeout(() => {
                        setVisibleImageIndices((prev) => {
                          const next = new Set(prev);
                          const nextBatchSize = Math.min(3, photos.length - index - 1);
                          for (let i = 1; i <= nextBatchSize; i++) {
                            next.add(index + i);
                          }
                          return next;
                        });
                      }, 500);
                    }
                  }
                }}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.imageLoadingPlaceholder}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </View>
      );
    },
    [styles, visibleImageIndices, photos, navigation, rollId, colors.textSecondary],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton} accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Image
              source={require('../assets/images/app_icon.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
          </View>
          {onOpenRollDetail ? (
            <TouchableOpacity onPress={onOpenRollDetail} style={styles.backButton}>
              <Ionicons name="open-outline" size={22} color={colors.buttonPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingInner}>
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.loadingInner}>
            <Text style={styles.emptyText}>No photos in this roll yet.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <Text style={styles.modalRollTitle} numberOfLines={2}>
              {rollTitle || 'Roll'}
            </Text>

            <View style={styles.galleryHeader}>
              <Text style={styles.galleryTitle}>Photos</Text>
              <Text style={styles.photoCountText}>
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </Text>
            </View>

            <FlatList
              data={gridData}
              keyExtractor={(it) => it.id.toString()}
              renderItem={renderImageItem}
              numColumns={GRID_COLUMNS}
              columnWrapperStyle={styles.columnWrapper}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              removeClippedSubviews
              maxToRenderPerBatch={3}
              updateCellsBatchingPeriod={200}
              initialNumToRender={6}
              windowSize={2}
            />

            {!showAllImages && photos.length > 6 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  setShowAllImages(true);
                  setVisibleImageIndices(new Set(photos.map((_, i) => i)));
                }}
              >
                <Text style={styles.viewAllButtonText}>
                  View All ({photos.length} photos)
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.buttonPrimary} />
              </TouchableOpacity>
            )}

            <View style={styles.feedContainer}>
              <View style={styles.feedHeader}>
                <Text style={styles.feedTitle}>Contributions</Text>
              </View>

              {photos.map((item) => (
                <View key={item.id} style={styles.feedItem}>
                  <View style={styles.feedUserHeader}>
                    {item.avatarUrl ? (
                      <OptimizedImage
                        source={{ uri: item.avatarUrl }}
                        style={styles.feedAvatar}
                        resizeMode="cover"
                        showLoadingIndicator={false}
                      />
                    ) : (
                      <View style={styles.feedAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.feedUserText}>
                      <Text style={styles.feedUsername}>
                        {item.displayName || item.username || 'Unknown User'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate('PhotoViewer', {
                        photoId: item.id,
                        photoType: PHOTO_TYPES.ROLL_IMAGE,
                        rollId,
                        initialIndex: photos.findIndex((p) => p.id === item.id),
                      })
                    }
                  >
                    <OptimizedImage
                      source={{ uri: item.imageUrl }}
                      style={styles.feedImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  {!!item.caption && (
                    <View style={styles.feedCaptionContainer}>
                      <Text style={styles.feedCaption} numberOfLines={3}>
                        <Text style={styles.feedCaptionUsername}>
                          {item.displayName || item.username || 'Unknown'}
                        </Text>
                        {' '}
                        {item.caption}
                      </Text>
                    </View>
                  )}

                  <View style={styles.feedActionsContainer}>
                    <TouchableOpacity
                      style={styles.feedActionButton}
                      onPress={() => handleFeedLike(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={feedInteractions.get(item.id)?.liked ? 'heart' : 'heart-outline'}
                        size={24}
                        color={
                          feedInteractions.get(item.id)?.liked
                            ? colors.error
                            : colors.textPrimary
                        }
                      />
                      {(feedInteractions.get(item.id)?.likeCount || 0) > 0 && (
                        <Text style={styles.feedActionCount}>
                          {feedInteractions.get(item.id)?.likeCount || 0}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.feedActionButton}
                      onPress={() => handleFeedComment(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={feedCommentingItemId === item.id ? 'chatbubble' : 'chatbubble-outline'}
                        size={24}
                        color={
                          feedCommentingItemId === item.id ? colors.primary : colors.textPrimary
                        }
                      />
                      {(feedInteractions.get(item.id)?.commentCount || 0) > 0 && (
                        <Text style={styles.feedActionCount}>
                          {feedInteractions.get(item.id)?.commentCount || 0}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {feedItemComments.has(item.id) &&
                    feedItemComments.get(item.id).comments.length > 0 && (
                      <View style={styles.feedCommentsDisplayContainer}>
                        {feedItemComments.get(item.id).comments.map((comment) => (
                          <View key={comment.id} style={styles.feedCommentDisplayItem}>
                            <TouchableOpacity
                              onPress={() => {
                                if (comment.user_id) {
                                  navigation.navigate('PublicProfile', { userId: comment.user_id });
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.feedCommentDisplayUsername}>
                                {comment.user?.display_name || comment.user?.username || 'Unknown'}
                              </Text>
                            </TouchableOpacity>
                            <Text style={styles.feedCommentDisplayText}>{comment.comment_text}</Text>
                          </View>
                        ))}

                        {(() => {
                          const commentState = feedItemComments.get(item.id);
                          const totalCount =
                            commentState?.totalCount ||
                            feedInteractions.get(item.id)?.commentCount ||
                            0;
                          const visibleCount = commentState?.visibleCount || 0;
                          const hasMore = totalCount > visibleCount;

                          if (hasMore && !feedLoadingComments.get(item.id)) {
                            return (
                              <TouchableOpacity
                                style={styles.feedViewMoreButton}
                                onPress={() => loadFeedComments(item, false)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.feedViewMoreText}>
                                  View more comments ({totalCount - visibleCount} remaining)
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                          if (feedLoadingComments.get(item.id)) {
                            return (
                              <View style={styles.feedViewMoreButton}>
                                <ActivityIndicator size="small" color={colors.primary} />
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    )}

                  {feedCommentingItemId === item.id && user && (
                    <KeyboardAvoidingView
                      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                      <View style={styles.feedCommentInputSection}>
                        <View style={styles.feedCommentInputRow}>
                          <TextInput
                            style={styles.feedCommentInput}
                            placeholder="Add a comment..."
                            placeholderTextColor={colors.textSecondary}
                            value={feedCommentText}
                            onChangeText={setFeedCommentText}
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[
                              styles.feedSendButton,
                              (!feedCommentText.trim() ||
                                feedSubmittingComment ||
                                feedCommentText.length > 500) &&
                                styles.feedSendButtonDisabled,
                            ]}
                            onPress={() => handleFeedCommentSubmit(item)}
                            disabled={
                              !feedCommentText.trim() ||
                              feedSubmittingComment ||
                              feedCommentText.length > 500
                            }
                          >
                            {feedSubmittingComment ? (
                              <ActivityIndicator size="small" color={colors.buttonText} />
                            ) : (
                              <Ionicons name="send" size={20} color={colors.buttonText} />
                            )}
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.feedCharacterCount}>{feedCommentText.length}/500</Text>
                      </View>
                    </KeyboardAvoidingView>
                  )}

                  <View style={styles.feedTimestampContainer}>
                    <Text style={styles.feedTimestamp}>{formatTimestamp(item.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputBorder,
    },
    backButton: {
      padding: 4,
      width: 40,
      alignItems: 'center',
    },
    headerIconContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
    },
    scrollContent: {
      paddingHorizontal: GRID_PADDING,
      paddingBottom: 32,
    },
    modalRollTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      marginTop: 4,
    },
    loadingInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    galleryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    galleryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    photoCountText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    grid: {
      paddingBottom: 12,
    },
    columnWrapper: {
      marginBottom: GRID_GAP,
    },
    imageWrapper: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageContainer: {
      width: '100%',
      height: '100%',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageLoadingPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBackground,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.buttonPrimary,
      gap: 8,
    },
    viewAllButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.buttonPrimary,
    },
    feedContainer: {
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
      paddingTop: 16,
    },
    feedHeader: {
      marginBottom: 16,
    },
    feedTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    feedItem: {
      marginBottom: 32,
      backgroundColor: colors.background,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    feedUserHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background,
    },
    feedAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.inputBackground,
    },
    feedAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    feedUserText: {
      marginLeft: 12,
      flex: 1,
    },
    feedUsername: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    feedImage: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: colors.inputBackground,
    },
    feedCaptionContainer: {
      padding: 12,
      paddingTop: 8,
    },
    feedCaption: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    feedCaptionUsername: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    feedActionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
    },
    feedActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
      paddingVertical: 4,
    },
    feedActionCount: {
      marginLeft: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    feedCommentsDisplayContainer: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
    },
    feedCommentDisplayItem: {
      flexDirection: 'row',
      marginBottom: 8,
      flexWrap: 'wrap',
    },
    feedCommentDisplayUsername: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginRight: 6,
    },
    feedCommentDisplayText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    feedViewMoreButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    feedViewMoreText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    feedCommentInputSection: {
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
    },
    feedCommentInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    feedCommentInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.textPrimary,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    feedSendButton: {
      backgroundColor: colors.buttonPrimary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    feedSendButtonDisabled: {
      opacity: 0.5,
    },
    feedCharacterCount: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: 4,
    },
    feedTimestampContainer: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    feedTimestamp: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default PublicRollNewsfeedModal;
