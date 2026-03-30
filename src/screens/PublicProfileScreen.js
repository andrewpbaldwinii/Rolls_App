import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import OptimizedImage from '../components/OptimizedImage';
import {
  getPublicProfile,
  getPublicRolls,
  getPublicPhotos,
  uploadProfileImage,
  uploadPublicProfilePhoto,
  followUser,
  unfollowUser,
  isFollowing,
} from '../services/publicProfile';
import { getRollImageUrlAsync } from '../services/storage';
import { supabase } from '../lib/supabase';
import {
  likePhoto,
  unlikePhoto,
  getPhotoLikeCount,
  getPhotoCommentCount,
  getPhotosLikeStatus,
  addComment,
  getPhotoComments,
  PHOTO_TYPES,
} from '../services/interactions';
import { FlatList, RefreshControl, TextInput, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
// Calculate grid size for exactly 3 columns
// With 3 items per row: only 2 margins between items (1px each)
// So: 3 * GRID_SIZE + 2 = width
// Therefore: GRID_SIZE = (width - 2) / 3
const GRID_SIZE = Math.floor((width - 2) / 3); // 3 columns: account for 2px total margins between items

const PublicProfileScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const userId = route?.params?.userId || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;
  // Removed roll-related functions - public profile photos don't use rolls

  const [profile, setProfile] = useState(null);
  const [publicRolls, setPublicRolls] = useState([]);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollTitleImageUrls, setRollTitleImageUrls] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewMode, setViewMode] = useState('photos'); // 'photos', 'rolls', or 'feed'
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [canViewPrivateProfile, setCanViewPrivateProfile] = useState(true);
  // Feed view state
  const [feedItems, setFeedItems] = useState([]);
  const [feedInteractions, setFeedInteractions] = useState(new Map());
  const [feedCommentingItemId, setFeedCommentingItemId] = useState(null);
  const [feedCommentText, setFeedCommentText] = useState('');
  const [feedSubmittingComment, setFeedSubmittingComment] = useState(false);
  const [feedItemComments, setFeedItemComments] = useState(new Map());
  const [feedLoadingComments, setFeedLoadingComments] = useState(new Map());
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [profileUnavailable, setProfileUnavailable] = useState(false);

  // useCallback hook - must be called after all useState hooks
  const loadProfileData = useCallback(async () => {
    if (!userId) {
      console.error('No user ID provided');
      Alert.alert('Error', 'No user ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setProfileUnavailable(false);

      // OPTIMIZED: Get current user once and reuse
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      const currentUserId = currentAuthUser?.id || null;
      
      // Load profile first (most critical) - now includes profile_is_public
      let profileData;
      try {
        const viewerForPrivacy = isOwnProfile ? null : currentUserId;
        profileData = await getPublicProfile(userId, false, viewerForPrivacy);
        if (profileData?.profileUnavailable) {
          setProfileUnavailable(true);
          setProfile(null);
          setPublicRolls([]);
          setPublicPhotos([]);
          setFeedItems([]);
          return;
        }
        setProfileUnavailable(false);
        if (!profileData) {
          throw new Error('Profile not found');
        }
        setProfile(profileData);
      } catch (profileError) {
        console.error('Error loading profile:', profileError);
        Alert.alert(
          'Error Loading Profile',
          profileError.message || 'Failed to load profile. Please check your connection and try again.'
        );
        return;
      }

      // OPTIMIZED: Use profile_is_public from profile data (already loaded)
      // Note: Profile header is always visible, only photos/rolls content is restricted
      let canViewContent = true; // Can view photos/rolls grids
      let isPrivate = false;
      
      if (!isOwnProfile) {
        // profile_is_public is now included in profileData from getPublicProfile
        const profileIsPublic = profileData?.profile_is_public ?? true;
        isPrivate = !profileIsPublic;
        setIsProfilePrivate(isPrivate);

        if (isPrivate && currentUserId) {
          // Check if current user is following (run in parallel with other data)
          // This will be checked in the Promise.all below
        }
      }
      
      // OPTIMIZED: Load all data in parallel - profile privacy check is already done
      // Photos/rolls only loaded if can view content (for private profiles)
      // Follow status always checked (so follow button works)
      const [rolls, photos, followStatus, followCheckResult] = await Promise.allSettled([
        // Only load if public or own profile (will check canViewContent after follow check)
        getPublicRolls(userId, currentUserId).catch(() => []),
        getPublicPhotos(userId, currentUserId).catch(() => []),
        !isOwnProfile ? isFollowing(userId) : Promise.resolve(false),
        // Check follow status for private profiles
        (isPrivate && currentUserId && !isOwnProfile) 
          ? supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUserId)
              .eq('following_id', userId)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      // Determine if can view content based on follow check for private profiles
      if (isPrivate && !isOwnProfile) {
        if (followCheckResult.status === 'fulfilled') {
          const { data: followData, error: followError } = followCheckResult.value;
          // If table doesn't exist (PGRST205), treat as not following
          if (followError && followError.code === 'PGRST205') {
            canViewContent = false;
          } else {
            canViewContent = !!followData;
          }
        } else {
          canViewContent = false;
        }
      }
      
      setCanViewPrivateProfile(canViewContent);

      // Filter rolls/photos based on canViewContent
      const loadedRolls = (canViewContent && rolls.status === 'fulfilled') ? rolls.value : [];
      const loadedPhotos = (canViewContent && photos.status === 'fulfilled') ? photos.value : [];
      
      setPublicRolls(loadedRolls);
      setPublicPhotos(loadedPhotos);
      setFollowing(followStatus.status === 'fulfilled' ? followStatus.value : false);

      // OPTIMIZED: Title image URLs are now pre-processed in getPublicRolls
      // Set them immediately so images can start loading right away
      if (loadedRolls.length > 0) {
        const titleImageUrlMap = {};
        loadedRolls.forEach(roll => {
          if (roll.title_image_url) {
            titleImageUrlMap[roll.id] = roll.title_image_url;
          }
        });
        setRollTitleImageUrls(titleImageUrlMap);
      }
      
      // Prepare feed items from photos (newsfeed style) - sorted by created_at descending
      if (loadedPhotos.length > 0) {
        const feedItemsData = loadedPhotos
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map(photo => ({
            id: photo.id,
            type: 'profile_photo',
            imageUrl: photo.image_url,
            caption: photo.caption,
            createdAt: photo.created_at,
            userId: userId,
            username: profileData?.username || null,
            displayName: profileData?.display_name || null,
            avatarUrl: profileData?.avatar_url || null,
          }));
        setFeedItems(feedItemsData);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load profile data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile]);

  // useEffect hook - must be called after useCallback
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // useFocusEffect hook - must be called after useEffect
  useFocusEffect(
    useCallback(() => {
      console.log('PublicProfileScreen focused - refreshing stats');
      loadProfileData();
    }, [loadProfileData])
  );

  // Load feed interactions when feed items change
  useEffect(() => {
    if (currentUser && feedItems.length > 0) {
      loadFeedInteractions(feedItems);
    }
  }, [feedItems, currentUser, loadFeedInteractions]);

  // Load interactions for feed items
  const loadFeedInteractions = useCallback(async (items) => {
    if (!currentUser || items.length === 0) return;

    try {
      const photos = items.map(item => ({
        id: item.id,
        type: PHOTO_TYPES.PROFILE_PHOTO,
      }));

      const likeStatusMap = await getPhotosLikeStatus(photos, currentUser.id);

      const commentCounts = await Promise.all(
        photos.map(async (photo) => {
          const count = await getPhotoCommentCount(photo.id, photo.type);
          return { id: photo.id, count };
        })
      );

      setFeedInteractions(prev => {
        const newMap = new Map(prev);
        items.forEach((item) => {
          const likeStatus = likeStatusMap.get(item.id) || { liked: false, count: 0 };
          const commentCount = commentCounts.find(c => c.id === item.id)?.count || 0;
          
          newMap.set(item.id, {
            liked: likeStatus.liked,
            likeCount: likeStatus.count,
            commentCount,
          });
        });
        return newMap;
      });

      // Auto-load first comment for items with comments
      items.forEach((item) => {
        const commentCount = commentCounts.find(c => c.id === item.id)?.count || 0;
        if (commentCount > 0 && !feedItemComments.has(item.id)) {
          loadFeedComments(item, true);
        }
      });
    } catch (error) {
      console.error('Error loading feed interactions:', error);
    }
  }, [currentUser, feedItemComments]);

  // Load comments for feed item
  const loadFeedComments = useCallback(async (item, initialLoad = false) => {
    try {
      setFeedLoadingComments(prev => {
        const newMap = new Map(prev);
        newMap.set(item.id, true);
        return newMap;
      });

      const currentState = feedItemComments.get(item.id);
      const offset = initialLoad ? 0 : (currentState?.visibleCount || 1);
      const limit = initialLoad ? 1 : 5;

      const comments = await getPhotoComments(item.id, PHOTO_TYPES.PROFILE_PHOTO, { limit, offset });

      setFeedItemComments(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(item.id) || { comments: [], visibleCount: 0 };
        
        if (initialLoad) {
          newMap.set(item.id, {
            comments: comments,
            visibleCount: comments.length,
            totalCount: feedInteractions.get(item.id)?.commentCount || 0,
          });
        } else {
          newMap.set(item.id, {
            comments: [...existing.comments, ...comments],
            visibleCount: existing.visibleCount + comments.length,
            totalCount: existing.totalCount || feedInteractions.get(item.id)?.commentCount || 0,
          });
        }
        return newMap;
      });
    } catch (error) {
      console.error('Error loading feed comments:', error);
    } finally {
      setFeedLoadingComments(prev => {
        const newMap = new Map(prev);
        newMap.set(item.id, false);
        return newMap;
      });
    }
  }, [feedItemComments, feedInteractions]);

  // Handle like for feed item
  const handleFeedLike = useCallback(async (item) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to like photos');
      return;
    }

    try {
      const currentStatus = feedInteractions.get(item.id) || { liked: false, likeCount: 0 };
      
      if (currentStatus.liked) {
        await unlikePhoto(item.id, PHOTO_TYPES.PROFILE_PHOTO, currentUser.id);
        setFeedInteractions(prev => {
          const newMap = new Map(prev);
          newMap.set(item.id, {
            ...currentStatus,
            liked: false,
            likeCount: Math.max(0, currentStatus.likeCount - 1),
          });
          return newMap;
        });
      } else {
        await likePhoto(item.id, PHOTO_TYPES.PROFILE_PHOTO, currentUser.id);
        setFeedInteractions(prev => {
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
  }, [currentUser, feedInteractions]);

  // Handle comment for feed item
  const handleFeedComment = useCallback((item) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to comment on photos');
      return;
    }

    if (feedCommentingItemId === item.id) {
      setFeedCommentingItemId(null);
      setFeedCommentText('');
    } else {
      setFeedCommentingItemId(item.id);
      setFeedCommentText('');
    }
  }, [currentUser, feedCommentingItemId]);

  // Handle comment submit for feed item
  const handleFeedCommentSubmit = useCallback(async (item) => {
    if (!currentUser || !feedCommentText.trim()) return;

    if (feedCommentText.trim().length > 500) {
      Alert.alert('Comment Too Long', 'Comments must be 500 characters or less.');
      return;
    }

    try {
      setFeedSubmittingComment(true);
      const newComment = await addComment(item.id, PHOTO_TYPES.PROFILE_PHOTO, currentUser.id, feedCommentText.trim());
      
      setFeedInteractions(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(item.id) || { liked: false, likeCount: 0, commentCount: 0 };
        newMap.set(item.id, {
          ...current,
          commentCount: (current.commentCount || 0) + 1,
        });
        return newMap;
      });

      setFeedItemComments(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(item.id) || { comments: [], visibleCount: 0 };
        newMap.set(item.id, {
          comments: [...existing.comments, newComment],
          visibleCount: existing.visibleCount + 1,
          totalCount: (existing.totalCount || 0) + 1,
        });
        return newMap;
      });

      setFeedCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment. Please try again.');
    } finally {
      setFeedSubmittingComment(false);
    }
  }, [currentUser, feedCommentText]);

  // Format timestamp helper
  const formatTimestamp = useCallback((timestamp) => {
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
  }, []);

  const handleImagePicker = async () => {
    // Note: You'll need to install react-native-image-picker
    // For now, this is a placeholder
    Alert.alert(
      'Image Picker',
      'To enable profile image upload, please install react-native-image-picker:\n\nnpm install react-native-image-picker',
      [{ text: 'OK' }]
    );

    // Uncomment when image picker is installed:
    /*
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      setUploadingImage(true);
      const imageUrl = await uploadProfileImage(userId, result.assets[0].uri);
      setProfile({ ...profile, avatar_url: imageUrl });
      Alert.alert('Success', 'Profile image updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
    */
  };

  // Request storage permission for Android
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  // Handle photo upload to photos tab (standalone public photos, NOT attached to any roll)
  const handlePhotoUpload = async () => {
    if (!isOwnProfile) return;

    // Request permissions for Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Photo access permission is required to select images from your Photos app.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
      selectionLimit: 1,
      includeBase64: true, // Get base64 data to avoid content:// URI issues on Android
    };

    setUploadingPhoto(true);
    try {
      launchImageLibrary(options, async (response) => {
        if (response.didCancel) {
          setUploadingPhoto(false);
          return;
        }

        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          setUploadingPhoto(false);
          return;
        }

        if (response.assets && response.assets[0]) {
          const selectedImage = response.assets[0];

          try {
            // Upload directly to public_profile_photos table (NOT to a roll)
            await uploadPublicProfilePhoto(
              userId,
              selectedImage.uri,
              selectedImage.base64,
              null // No caption for now
            );

            // Refresh photos list
            await loadProfileData();

            Alert.alert('Success! ✅', 'Photo added to your profile');
          } catch (error) {
            console.error('Error uploading photo:', error);
            Alert.alert('Error', error.message || 'Failed to upload photo');
          } finally {
            setUploadingPhoto(false);
          }
        } else {
          setUploadingPhoto(false);
        }
      });
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open image picker');
      setUploadingPhoto(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
      } else {
        await followUser(userId);
        setFollowing(true);
      }
      // Reload stats
      const profileData = await getPublicProfile(
        userId,
        true,
        isOwnProfile ? null : currentUser?.id
      );
      if (profileData?.profileUnavailable) {
        setProfileUnavailable(true);
        setProfile(null);
        return;
      }
      setProfileUnavailable(false);
      setProfile(profileData);
    } catch (err) {
      console.error('Error toggling follow:', err);
      // Use setTimeout to ensure component is mounted before showing alert
      setTimeout(() => {
        try {
          const errorMessage = err?.message || 'Failed to update follow status';
          Alert.alert('Error', errorMessage);
        } catch (alertError) {
          // If alert fails, just log it
          console.warn('Could not show alert:', alertError);
        }
      }, 100);
    }
  };

  const renderProfileImage = () => {
    if (profile?.avatar_url) {
      return (
        <OptimizedImage
          source={{ uri: profile.avatar_url }}
          style={styles.profileImage}
          showLoadingIndicator={false}
        />
      );
    }

    // Fallback to initials
    const getInitials = (name) => {
      if (!name) return 'U';
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    return (
      <View style={styles.profileImagePlaceholder}>
        <Text style={styles.profileInitials}>
          {getInitials(profile?.display_name || 'User')}
        </Text>
      </View>
    );
  };

  const renderPhotoGrid = () => {
    if (publicPhotos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No public photos yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {publicPhotos.map((photo, index) => {
          // Calculate if this is the first item in a row (index % 3 === 0)
          const isFirstInRow = index % 3 === 0;
          const isLastInRow = (index + 1) % 3 === 0;
          
          return (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.gridItem,
                isFirstInRow && styles.gridItemFirst,
                isLastInRow && styles.gridItemLast,
              ]}
              onPress={() => {
                navigation.navigate('PhotoViewer', {
                  photoId: photo.id,
                  photoType: 'profile_photo',
                  userId: userId,
                  initialIndex: index,
                });
              }}
            >
              <OptimizedImage
                source={{ uri: photo.image_url }}
                style={styles.gridImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render feed view (newsfeed style) - simplified to work in ScrollView
  const renderFeed = () => {
    if (feedItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No photos yet</Text>
        </View>
      );
    }

    return (
      <View>
        {feedItems.map((item) => {
          return (
            <View key={item.id} style={styles.feedItem}>
          {/* User Header */}
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

          {/* Image */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('PhotoViewer', {
                photoId: item.id,
                photoType: PHOTO_TYPES.PROFILE_PHOTO,
                userId: userId,
                initialIndex: feedItems.findIndex(i => i.id === item.id),
              });
            }}
          >
            <OptimizedImage
              source={{ uri: item.imageUrl }}
              style={styles.feedImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Caption */}
          {item.caption && (
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

          {/* Like/Comment Actions */}
          <View style={styles.feedActionsContainer}>
            <TouchableOpacity
              style={styles.feedActionButton}
              onPress={() => handleFeedLike(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={feedInteractions.get(item.id)?.liked ? 'heart' : 'heart-outline'}
                size={24}
                color={feedInteractions.get(item.id)?.liked ? colors.error : colors.textPrimary}
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
                color={feedCommentingItemId === item.id ? colors.primary : colors.textPrimary}
              />
              {(feedInteractions.get(item.id)?.commentCount || 0) > 0 && (
                <Text style={styles.feedActionCount}>
                  {feedInteractions.get(item.id)?.commentCount || 0}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Comments Display */}
          {feedItemComments.has(item.id) && feedItemComments.get(item.id).comments.length > 0 && (
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
              
              {/* View More Button */}
              {(() => {
                const commentState = feedItemComments.get(item.id);
                const totalCount = commentState?.totalCount || feedInteractions.get(item.id)?.commentCount || 0;
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
                } else if (feedLoadingComments.get(item.id)) {
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

          {/* Inline Comment Input */}
          {feedCommentingItemId === item.id && currentUser && (
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
                    (!feedCommentText.trim() || feedSubmittingComment || feedCommentText.length > 500) && styles.feedSendButtonDisabled
                  ]}
                  onPress={() => handleFeedCommentSubmit(item)}
                  disabled={!feedCommentText.trim() || feedSubmittingComment || feedCommentText.length > 500}
                >
                  {feedSubmittingComment ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Ionicons name="send" size={20} color={colors.buttonText} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.feedCharacterCount}>
                {feedCommentText.length}/500
              </Text>
            </View>
          )}

          {/* Timestamp */}
          <View style={styles.feedTimestampContainer}>
            <Text style={styles.feedTimestamp}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        </View>
          );
        })}
      </View>
    );
  };

  const renderRollsGrid = () => {
    if (publicRolls.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No public rolls yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.rollsGrid}>
        {publicRolls.map((roll, index) => {
          // Calculate if this is the first item in a row (index % 3 === 0)
          const isFirstInRow = index % 3 === 0;
          const isLastInRow = (index + 1) % 3 === 0;
          
          return (
            <TouchableOpacity
              key={roll.id}
              style={[
                styles.rollGridItem,
                isFirstInRow && styles.rollGridItemFirst,
                isLastInRow && styles.rollGridItemLast,
              ]}
              onPress={() => {
                navigation?.navigate('RollDetail', { 
                  rollId: roll.id,
                  initialRoll: roll
                });
              }}
              activeOpacity={0.8}
            >
              {rollTitleImageUrls[roll.id] || roll.title_image_url ? (
                <OptimizedImage 
                  source={{ uri: rollTitleImageUrls[roll.id] || roll.title_image_url }} 
                  style={styles.rollGridImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.rollGridPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.rollGridOverlay}>
                <Text style={styles.rollGridTitle} numberOfLines={1}>
                  {roll.title}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (profileUnavailable) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          {navigation && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="eye-off-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>Profile unavailable</Text>
          <Text style={styles.errorSubtext}>
            You cannot view this profile. The owner may have restricted who can see it.
          </Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const stats = profile.stats || { rolls_created: 0, photos_taken: 0, followers_count: 0 };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {navigation && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Profile' : profile.username || 'Profile'}
        </Text>
        <View style={styles.headerRight}>
          {isOwnProfile && viewMode === 'photos' && (
            <TouchableOpacity 
              onPress={handlePhotoUpload}
              disabled={uploadingPhoto}
              style={styles.uploadButton}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <Ionicons name="add-circle-outline" size={24} color={colors.textWhite} />
              )}
            </TouchableOpacity>
          )}
          {isOwnProfile && viewMode !== 'photos' && (
            <TouchableOpacity onPress={() => console.log('Settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.textWhite} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          {/* Profile Image */}
          <TouchableOpacity
            onPress={isOwnProfile ? handleImagePicker : undefined}
            disabled={!isOwnProfile || uploadingImage}
            activeOpacity={isOwnProfile ? 0.7 : 1}
          >
            <View style={styles.profileImageContainer}>
              {uploadingImage ? (
                <View style={styles.profileImage}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                renderProfileImage()
              )}
              {isOwnProfile && (
                <View style={styles.editImageBadge}>
                  <Ionicons name="camera" size={16} color={colors.textWhite} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.rolls_created || 0}</Text>
              <Text style={styles.statLabel}>Rolls Created</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.photos_taken || 0}</Text>
              <Text style={styles.statLabel}>Photos Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{profile.display_name || 'User'}</Text>
          {profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {(profile.email || (isOwnProfile && currentUser?.email)) && (
            <Text style={styles.email}>{profile.email || currentUser?.email}</Text>
          )}
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.followButton, following && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              activeOpacity={0.75}
              onPress={() => {
                navigation.navigate('Message', {
                  userId: userId,
                });
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'photos' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('photos')}
          >
            <Ionicons
              name={viewMode === 'photos' ? 'grid' : 'grid-outline'}
              size={20}
              color={viewMode === 'photos' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'photos' && styles.viewModeTextActive,
              ]}
            >
              Photos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'rolls' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('rolls')}
          >
            <Ionicons
              name={viewMode === 'rolls' ? 'albums' : 'albums-outline'}
              size={20}
              color={viewMode === 'rolls' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'rolls' && styles.viewModeTextActive,
              ]}
            >
              Rolls
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'feed' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('feed')}
          >
            <Ionicons
              name={viewMode === 'feed' ? 'list' : 'list-outline'}
              size={20}
              color={viewMode === 'feed' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'feed' && styles.viewModeTextActive,
              ]}
            >
              Feed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {/* Show locked message if private and not following, otherwise show content */}
        {/* Profile header above is always visible - only content grids are restricted */}
        {isProfilePrivate && !canViewPrivateProfile ? (
          <View style={styles.lockedContentContainer}>
            <Ionicons name="lock-closed" size={48} color={colors.textSecondary} />
            <Text style={styles.lockedContentTitle}>This {viewMode === 'photos' ? 'photos' : viewMode === 'rolls' ? 'rolls' : 'feed'} is private</Text>
            <Text style={styles.lockedContentText}>
              Follow @{profile?.username || 'this user'} to see their {viewMode === 'photos' ? 'photos' : viewMode === 'rolls' ? 'rolls' : 'content'}
            </Text>
            {!following && (
              <TouchableOpacity
                style={styles.lockedFollowButton}
                onPress={handleFollow}
              >
                <Text style={styles.lockedFollowButtonText}>Follow</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {viewMode === 'photos' && (publicPhotos.length > 0 ? renderPhotoGrid() : (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No public photos yet</Text>
              </View>
            ))}
            {viewMode === 'rolls' && (publicRolls.length > 0 ? renderRollsGrid() : (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No public rolls yet</Text>
              </View>
            ))}
            {viewMode === 'feed' && renderFeed()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.navBackground,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textWhite,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  uploadButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.error,
  },
  errorSubtext: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  lockedProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedProfileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  lockedProfileText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  lockedContentContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  lockedContentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  lockedContentText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  lockedFollowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  lockedFollowButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 24,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textWhite,
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userInfo: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 46,
  },
  followingButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  followButtonText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  followingButtonText: {
    color: colors.textPrimary,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  messageButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewModeButtonActive: {
    borderBottomColor: colors.primary,
  },
  viewModeText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewModeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    width: '100%', // Ensure full width
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    marginRight: 1,
    marginBottom: 1,
  },
  gridItemFirst: {
    marginLeft: 0, // No left margin for first item in row
  },
  gridItemLast: {
    marginRight: 0, // No right margin for last item in row
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  rollsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    width: '100%', // Ensure full width
  },
  rollGridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    marginRight: 1,
    marginBottom: 1,
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rollGridItemFirst: {
    marginLeft: 0, // No left margin for first item in row
  },
  rollGridItemLast: {
    marginRight: 0, // No right margin for last item in row
  },
  rollGridImage: {
    width: '100%',
    height: '100%',
  },
  rollGridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollGridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  rollGridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  // Feed view styles
  feedListContent: {
    paddingBottom: 20,
  },
  feedItem: {
    backgroundColor: colors.background,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  feedUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  feedAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedUserText: {
    flex: 1,
  },
  feedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  feedImage: {
    width: width,
    height: width,
    backgroundColor: colors.inputBackground,
  },
  feedCaptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  feedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  feedActionCount: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  feedCommentsDisplayContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  feedCommentDisplayItem: {
    marginBottom: 12,
  },
  feedCommentDisplayUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  feedCommentDisplayText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  feedViewMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  feedViewMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  feedCommentInputSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.background,
  },
  feedCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  feedCommentInput: {
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
  feedCharacterCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    paddingRight: 4,
  },
  feedSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedSendButtonDisabled: {
    opacity: 0.5,
  },
  feedTimestampContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  feedTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});



export default PublicProfileScreen;

