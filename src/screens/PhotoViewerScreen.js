import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { getPublicPhotos } from '../services/publicProfile';
import {
  likePhoto,
  unlikePhoto,
  hasUserLikedPhoto,
  getPhotoLikeCount,
  getPhotoComments,
  addComment,
  getPhotoCommentCount,
  PHOTO_TYPES,
} from '../services/interactions';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PhotoViewerScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  const { photoId, photoType, userId, initialIndex = 0, showComments = false } = route.params || {};
  
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [visibleCommentCount, setVisibleCommentCount] = useState(1); // Show first comment initially
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState(showComments);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const currentPhoto = photos[currentIndex];

  // Load photos for this user
  useEffect(() => {
    loadPhotos();
  }, [userId]);

  // Load interactions for current photo
  useEffect(() => {
    if (currentPhoto) {
      loadPhotoInteractions();
      loadPhotoComments();
    }
  }, [currentPhoto, user]);

  // Handle keyboard show/hide
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadPhotos = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userPhotos = await getPublicPhotos(userId);
      setPhotos(userPhotos || []);
      
      // Find initial photo index if photoId provided
      if (photoId) {
        const index = userPhotos.findIndex(p => p.id === photoId);
        if (index >= 0) {
          setCurrentIndex(index);
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoInteractions = async () => {
    if (!currentPhoto || !user) return;

    try {
      const photoTypeValue = photoType || PHOTO_TYPES.PROFILE_PHOTO;
      const [isLiked, likes, count] = await Promise.all([
        hasUserLikedPhoto(currentPhoto.id, photoTypeValue, user.id),
        getPhotoLikeCount(currentPhoto.id, photoTypeValue),
        getPhotoCommentCount(currentPhoto.id, photoTypeValue),
      ]);

      setLiked(isLiked);
      setLikeCount(likes);
      setCommentCount(count);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const loadPhotoComments = async (loadMore = false) => {
    if (!currentPhoto) return;

    try {
      if (loadMore) {
        setLoadingMoreComments(true);
      } else {
        setLoadingComments(true);
      }
      
      const photoTypeValue = photoType || PHOTO_TYPES.PROFILE_PHOTO;
      const offset = loadMore ? visibleCommentCount : 0;
      const limit = loadMore ? 5 : 1; // First comment, then 5 at a time
      
      const photoComments = await getPhotoComments(currentPhoto.id, photoTypeValue, { limit, offset });
      
      if (loadMore) {
        setComments(prev => [...prev, ...photoComments]);
        setVisibleCommentCount(prev => prev + photoComments.length);
      } else {
        setComments(photoComments || []);
        setVisibleCommentCount(photoComments?.length || 0);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const handleViewMoreComments = () => {
    loadPhotoComments(true);
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like photos');
      return;
    }

    if (!currentPhoto) return;

    try {
      const photoTypeValue = photoType || PHOTO_TYPES.PROFILE_PHOTO;
      
      if (liked) {
        await unlikePhoto(currentPhoto.id, photoTypeValue, user.id);
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likePhoto(currentPhoto.id, photoTypeValue, user.id);
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to comment on photos');
      return;
    }

    if (!commentText.trim() || !currentPhoto) return;

    // Validate character limit
    if (commentText.trim().length > 500) {
      Alert.alert('Comment Too Long', 'Comments must be 500 characters or less.');
      return;
    }

    try {
      setSubmittingComment(true);
      const photoTypeValue = photoType || PHOTO_TYPES.PROFILE_PHOTO;
      const newComment = await addComment(
        currentPhoto.id,
        photoTypeValue,
        user.id,
        commentText.trim()
      );

      // Add comment to list (append to end since comments are sorted by created_at)
      setComments(prev => [...prev, newComment]);
      setVisibleCommentCount(prev => prev + 1);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSwipeLeft = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowCommentsSection(false); // Hide comments when swiping
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowCommentsSection(false); // Hide comments when swiping
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonText} />
        </View>
      </View>
    );
  }

  if (!currentPhoto || photos.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.buttonText} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No photos found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.buttonText} />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {currentIndex + 1} / {photos.length}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Photo Viewer */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
      >
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.photoContainer}>
            <Image
              source={{ uri: photo.image_url }}
              style={styles.photo}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>

      {/* Actions and Comments Section */}
      <View style={[styles.bottomSection, { bottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}>
        {/* Like/Comment Actions */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? colors.error : colors.buttonText}
            />
            {likeCount > 0 && (
              <Text style={styles.actionCount}>{likeCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const newShowState = !showCommentsSection;
              setShowCommentsSection(newShowState);
              // Load first comment when opening comments section
              if (newShowState && currentPhoto && comments.length === 0 && commentCount > 0) {
                loadPhotoComments(false);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showCommentsSection ? 'chatbubble' : 'chatbubble-outline'}
              size={28}
              color={colors.buttonText}
            />
            {commentCount > 0 && (
              <Text style={styles.actionCount}>{commentCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {currentPhoto.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{currentPhoto.caption}</Text>
          </View>
        )}

        {/* Comments Section */}
        {showCommentsSection && (
          <View style={styles.commentsContainer}>
            {loadingComments ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
            ) : (
              <ScrollView
                style={styles.commentsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {comments.map((item) => (
                  <View key={item.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <TouchableOpacity
                        onPress={() => {
                          if (item.user_id) {
                            navigation.navigate('PublicProfile', { userId: item.user_id });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.commentUsername}>
                          {item.user?.display_name || item.user?.username || 'Unknown'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.commentTime}>{formatTimestamp(item.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.comment_text}</Text>
                  </View>
                ))}
                
                {/* View More Button */}
                {(() => {
                  const hasMore = commentCount > visibleCommentCount;
                  if (hasMore && !loadingMoreComments) {
                    return (
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={handleViewMoreComments}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewMoreText}>
                          View more comments ({commentCount - visibleCommentCount} remaining)
                        </Text>
                      </TouchableOpacity>
                    );
                  } else if (loadingMoreComments) {
                    return (
                      <View style={styles.viewMoreButton}>
                        <ActivityIndicator size="small" color={colors.buttonText} />
                      </View>
                    );
                  }
                  return null;
                })()}
              </ScrollView>
            )}

            {/* Comment Input */}
            {user && (
              <View style={[styles.commentInputSection, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 10 : 10 }]}>
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
                    returnKeyType="default"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!commentText.trim() || submittingComment || commentText.length > 500) && styles.sendButtonDisabled
                    ]}
                    onPress={handleCommentSubmit}
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
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
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
  },
  emptyText: {
    color: colors.buttonText,
    fontSize: 16,
  },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.4,
    zIndex: 100,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionCount: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonText,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  caption: {
    fontSize: 14,
    color: colors.buttonText,
    lineHeight: 20,
  },
  commentsContainer: {
    maxHeight: SCREEN_HEIGHT * 0.3,
  },
  commentsList: {
    maxHeight: SCREEN_HEIGHT * 0.2,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonText,
  },
  commentText: {
    fontSize: 14,
    color: colors.buttonText,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  viewMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: colors.buttonText,
    fontWeight: '600',
  },
  commentInputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
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
});



export default PhotoViewerScreen;
