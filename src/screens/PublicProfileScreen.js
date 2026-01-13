import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import {
  getPublicProfile,
  getPublicRolls,
  getPublicPhotos,
  uploadProfileImage,
  followUser,
  unfollowUser,
  isFollowing,
} from '../services/publicProfile';
import colors from '../constants/colors';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3; // 3 columns with 2px gaps

const PublicProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const userId = route?.params?.userId || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [publicRolls, setPublicRolls] = useState([]);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewMode, setViewMode] = useState('photos'); // 'photos' or 'rolls'

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    if (!userId) {
      console.error('No user ID provided');
      Alert.alert('Error', 'No user ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load profile first (most critical)
      let profileData;
      try {
        profileData = await getPublicProfile(userId);
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

      // Load other data in parallel (non-critical)
      const [rolls, photos, followStatus] = await Promise.allSettled([
        getPublicRolls(userId),
        getPublicPhotos(userId),
        !isOwnProfile ? isFollowing(userId) : Promise.resolve(false),
      ]);

      setPublicRolls(rolls.status === 'fulfilled' ? rolls.value : []);
      setPublicPhotos(photos.status === 'fulfilled' ? photos.value : []);
      setFollowing(followStatus.status === 'fulfilled' ? followStatus.value : false);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load profile data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
      const profileData = await getPublicProfile(userId);
      setProfile(profileData);
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const renderProfileImage = () => {
    if (profile?.avatar_url) {
      return (
        <Image
          source={{ uri: profile.avatar_url }}
          style={styles.profileImage}
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
        {publicPhotos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.gridItem}
            onPress={() => {
              // TODO: Navigate to photo detail
              Alert.alert('Photo', photo.caption || 'No caption');
            }}
          >
            <Image
              source={{ uri: photo.image_url }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
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
      <View style={styles.rollsContainer}>
        {publicRolls.map((roll) => (
          <TouchableOpacity
            key={roll.id}
            style={styles.rollCard}
            onPress={() => {
              // TODO: Navigate to roll detail
              Alert.alert('Roll', roll.title);
            }}
          >
            <View style={styles.rollIconContainer}>
              <Ionicons name="camera" size={32} color={colors.primary} />
            </View>
            <Text style={styles.rollTitle} numberOfLines={2}>
              {roll.title}
            </Text>
            {roll.description && (
              <Text style={styles.rollDescription} numberOfLines={2}>
                {roll.description}
              </Text>
            )}
          </TouchableOpacity>
        ))}
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
          {isOwnProfile && (
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
          {profile.id && (
            <Text style={styles.userId}>ID: {profile.id}</Text>
          )}
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Action Button */}
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
        </View>

        {/* Content Grid */}
        {viewMode === 'photos' ? renderPhotoGrid() : renderRollsGrid()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  },
  scrollView: {
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
  userId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  actionButtonContainer: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  followButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: colors.textPrimary,
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
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1,
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
  rollsContainer: {
    padding: 16,
  },
  rollCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  rollIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rollTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  rollDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PublicProfileScreen;

