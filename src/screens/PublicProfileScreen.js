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
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
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
import colors from '../constants/colors';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3; // 3 columns with 2px gaps

const PublicProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const userId = route?.params?.userId || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;
  // Removed roll-related functions - public profile photos don't use rolls

  const [profile, setProfile] = useState(null);
  const [publicRolls, setPublicRolls] = useState([]);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
      <View style={styles.rollsGrid}>
        {publicRolls.map((roll) => (
          <TouchableOpacity
            key={roll.id}
            style={styles.rollGridItem}
            onPress={() => {
              navigation?.navigate('RollDetail', { 
                rollId: roll.id,
                initialRoll: roll
              });
            }}
            activeOpacity={0.8}
          >
            {roll.title_image_url ? (
              <Image 
                source={{ uri: roll.title_image_url }} 
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
    alignItems: 'flex-end',
  },
  uploadButton: {
    padding: 4,
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
  rollsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  rollGridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1,
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
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
});

export default PublicProfileScreen;

