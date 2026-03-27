import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getUserPhotos, getPublicProfile, clearProfileCache } from '../services/publicProfile';
import { useTheme } from '../contexts/ThemeContext';
import OptimizedImage from '../components/OptimizedImage';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 60) / 3; // 3 columns with margins

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      backgroundColor: colors.navBackground,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textWhite,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    profileCard: {
      backgroundColor: colors.background,
      marginTop: -10,
      marginHorizontal: 20,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    profilePictureContainer: {
      marginBottom: 16,
    },
    profilePicture: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.primaryDark,
      overflow: 'hidden',
    },
    profileInitials: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textWhite,
    },
    displayName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
      textAlign: 'center',
    },
    username: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    displayNameMuted: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      textAlign: 'center',
    },
    usernameMuted: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      opacity: 0,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      width: '100%',
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: colors.background,
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 12,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primaryDark,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.inputBorder,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 20,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.buttonSecondary,
    },
    signOutIcon: {
      marginRight: 8,
    },
    signOutText: {
      color: colors.buttonSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    bottomSpacing: {
      height: 20,
    },
    photosLoading: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    emptyPhotos: {
      padding: 40,
      alignItems: 'center',
    },
    emptyPhotosText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 4,
    },
    emptyPhotosSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    photosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 10,
      justifyContent: 'flex-start',
    },
    photoGridItem: {
      width: GRID_SIZE,
      height: GRID_SIZE,
      margin: 5,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.inputBackground,
    },
    photoGridImage: {
      width: '100%',
      height: '100%',
    },
    morePhotosOverlay: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    morePhotosText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    morePhotosLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, profile: authProfile, profileLoading, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, setDarkMode, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ rolls_created: 0, photos_taken: 0, followers_count: 0 });
  const [profileIsPublic, setProfileIsPublic] = useState(true);
  const [updatingProfilePrivacy, setUpdatingProfilePrivacy] = useState(false);

  // Stats (and any extra fields) from getPublicProfile; identity comes from AuthContext.profile
  const fetchUserProfile = async () => {
    if (!user?.id) {
      setLoadingProfile(false);
      return;
    }

    try {
      clearProfileCache(user.id);
      const profileData = await getPublicProfile(user.id, true);

      if (profileData) {
        setUserProfile({
          username: profileData.username,
          display_name: profileData.display_name,
          email: profileData.email,
          avatar_url: profileData.avatar_url,
        });
        if (profileData.stats) {
          setStats(profileData.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch profile privacy setting
  const fetchProfilePrivacy = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_is_public')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.warn('Error fetching profile privacy (column may not exist):', error);
        // Default to public if column doesn't exist yet
        setProfileIsPublic(true);
      } else {
        setProfileIsPublic(data?.profile_is_public ?? true);
      }
    } catch (err) {
      console.warn('Error fetching profile privacy:', err);
      setProfileIsPublic(true); // Default to public
    }
  };

  useEffect(() => {
    setLoadingProfile(true);
    fetchUserProfile();
    fetchProfilePrivacy();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  // Merge AuthContext profile (fast path after login) with stats fetch
  useEffect(() => {
    if (!authProfile) return;
    setUserProfile(prev => ({
      ...prev,
      username: authProfile.username ?? prev?.username,
      display_name: authProfile.display_name ?? prev?.display_name,
      email: authProfile.email ?? prev?.email ?? user?.email,
      avatar_url: authProfile.avatar_url ?? prev?.avatar_url,
    }));
  }, [authProfile, user?.email]);

  // Fetch user photos
  const fetchUserPhotos = async () => {
    if (!user?.id) {
      setLoadingPhotos(false);
      return;
    }

    try {
      setLoadingPhotos(true);
      const photos = await getUserPhotos(user.id);
      // Ensure photos is an array
      setUserPhotos(Array.isArray(photos) ? photos : []);
    } catch (error) {
      console.error('Error fetching user photos:', error);
      setUserPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    fetchUserPhotos();
  }, [user?.id]);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        fetchUserProfile(),
        fetchUserPhotos(),
      ]);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const metaDisplay =
    user?.user_metadata?.display_name || user?.user_metadata?.username;
  const metaUsername = user?.user_metadata?.username;
  const fromRow =
    userProfile?.display_name ||
    userProfile?.username ||
    authProfile?.display_name ||
    authProfile?.username;

  const hasIdentity =
    !!(userProfile?.username ||
      userProfile?.display_name ||
      authProfile?.username ||
      authProfile?.display_name ||
      metaDisplay);

  // No email flash: wait for auth profile fetch unless JWT already has metadata from signup
  const showIdentityPlaceholder = profileLoading && !hasIdentity;

  const displayName =
    userProfile?.display_name ||
    userProfile?.username ||
    authProfile?.display_name ||
    authProfile?.username ||
    metaDisplay ||
    (!profileLoading ? user?.email?.split('@')[0] : null) ||
    'User';
  const username =
    userProfile?.username ||
    authProfile?.username ||
    metaUsername ||
    metaDisplay ||
    (!profileLoading ? user?.email?.split('@')[0] : null) ||
    'user';
  
  // Get initials for profile picture
  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const initials = getInitials(
    (fromRow || metaDisplay || displayName || 'User').replace(/^@/, '')
  );

  // Toggle profile privacy
  const handleToggleProfilePrivacy = async (value) => {
    setUpdatingProfilePrivacy(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_is_public: value })
        .eq('id', user.id);
      
      if (error) {
        // Check if column doesn't exist
        if (error.message?.includes('profile_is_public') || error.code === '42703') {
          Alert.alert(
            'Database Update Required',
            'The profile privacy feature requires a database update.\n\n' +
            'Please run ADD_PROFILE_PRIVACY.sql in Supabase SQL Editor.'
          );
          return;
        }
        throw error;
      }
      
      setProfileIsPublic(value);
      Alert.alert(
        'Success',
        value 
          ? 'Your profile is now public. Anyone can view your photos and rolls.' 
          : 'Your profile is now private. Only followers can view your content.'
      );
    } catch (error) {
      console.error('Error updating profile privacy:', error);
      Alert.alert('Error', error.message || 'Failed to update profile privacy');
    } finally {
      setUpdatingProfilePrivacy(false);
    }
  };

  // Stats are now fetched from getPublicProfile and stored in state
  // They will be displayed directly from the stats state

  const SettingItem = ({ icon, label, onPress, rightElement }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={20} color={colors.textPrimary} style={styles.settingIcon} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      {/* Teal Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.buttonPrimary}
            colors={[colors.buttonPrimary]}
          />
        }
      >
        {/* Profile Summary Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            {showIdentityPlaceholder ? (
              <View style={styles.profilePicture}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
              </View>
            ) : userProfile?.avatar_url || authProfile?.avatar_url ? (
              <OptimizedImage
                source={{ uri: userProfile?.avatar_url || authProfile?.avatar_url }}
                style={styles.profilePicture}
                resizeMode="cover"
                showLoadingIndicator={true}
              />
            ) : (
              <View style={styles.profilePicture}>
                <Text style={styles.profileInitials}>{initials}</Text>
              </View>
            )}
          </View>
          
          {/* User Name */}
          {showIdentityPlaceholder ? (
            <>
              <Text style={styles.displayNameMuted}>Loading profile…</Text>
              <Text style={styles.usernameMuted}> </Text>
            </>
          ) : (
            <>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.username}>@{username}</Text>
            </>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
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

        {/* Account Settings Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <SettingItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation?.navigate('EditProfile')}
          />
          <SettingItem
            icon="eye-outline"
            label="View Public Profile"
            onPress={() => navigation?.navigate('PublicProfile', { userId: user?.id })}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Privacy Settings"
            onPress={() => console.log('Privacy Settings')}
          />
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons
                name={profileIsPublic ? "globe-outline" : "lock-closed-outline"}
                size={20}
                color={colors.textPrimary}
                style={styles.settingIcon}
              />
              <View style={styles.settingLabelContainer}>
                <Text style={styles.settingLabel}>Public Profile</Text>
                <Text style={styles.settingSubtext}>
                  {profileIsPublic 
                    ? 'Anyone can view your profile' 
                    : 'Only followers can view your profile'}
                </Text>
              </View>
            </View>
            <Switch
              value={profileIsPublic}
              onValueChange={handleToggleProfilePrivacy}
              disabled={updatingProfilePrivacy}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor={colors.textWhite}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.settingIcon}
              />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor={colors.textWhite}
            />
          </View>
        </View>

        {/* Roll Management Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Roll Management</Text>
          <SettingItem
            icon="camera-outline"
            label="My Rolls"
            onPress={() => console.log('My Rolls')}
          />
          <SettingItem
            icon="people-outline"
            label="Rolls I've Joined"
            onPress={() => console.log('Rolls I\'ve Joined')}
          />
          <SettingItem
            icon="archive-outline"
            label="Archived Rolls"
            onPress={() => console.log('Archived Rolls')}
          />
        </View>

        {/* My Photos Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My Photos</Text>
          {loadingPhotos ? (
            <View style={styles.photosLoading}>
              <Text style={styles.loadingText}>Loading photos...</Text>
            </View>
          ) : userPhotos.length === 0 ? (
            <View style={styles.emptyPhotos}>
              <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyPhotosText}>No photos yet</Text>
              <Text style={styles.emptyPhotosSubtext}>Start taking photos to see them here</Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {userPhotos.slice(0, 9).map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoGridItem}
                  onPress={() => {
                    // TODO: Navigate to photo detail or roll
                    console.log('Photo tapped:', photo.id);
                  }}
                >
                  <OptimizedImage
                    source={{ uri: photo.image_url }}
                    style={styles.photoGridImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
              {userPhotos.length > 9 && (
                <TouchableOpacity
                  style={styles.photoGridItem}
                  onPress={() => {
                    // TODO: Navigate to all photos view
                    console.log('View all photos');
                  }}
                >
                  <View style={styles.morePhotosOverlay}>
                    <Text style={styles.morePhotosText}>+{userPhotos.length - 9}</Text>
                    <Text style={styles.morePhotosLabel}>More</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingItem
            icon="camera-outline"
            label="Camera Quality"
            onPress={() => console.log('Camera Quality')}
          />
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="images-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.settingIcon}
              />
              <Text style={styles.settingLabel}>Auto-save to Photos</Text>
            </View>
            <Switch
              value={autoSaveEnabled}
              onValueChange={setAutoSaveEnabled}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor={colors.textWhite}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="moon-outline"
                size={20}
                color={colors.textPrimary}
                style={styles.settingIcon}
              />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor={colors.textWhite}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => console.log('Help & FAQ')}
          />
          <SettingItem
            icon="mail-outline"
            label="Contact Support"
            onPress={() => console.log('Contact Support')}
          />
          <SettingItem
            icon="information-circle-outline"
            label="About Roll"
            onPress={() => console.log('About Roll')}
          />
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.buttonSecondary} style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
