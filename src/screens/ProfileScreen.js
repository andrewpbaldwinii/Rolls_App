import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getUserPhotos } from '../services/publicProfile';
import colors from '../constants/colors';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 60) / 3; // 3 columns with margins

const ProfileScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user profile from public.users table
  const fetchUserProfile = async () => {
    if (!user?.id) {
      setLoadingProfile(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, display_name, email, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to email-based values if profile doesn't exist
        setUserProfile({
          username: user.email?.split('@')[0] || 'user',
          display_name: user.email?.split('@')[0] || 'User',
        });
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserProfile({
        username: user.email?.split('@')[0] || 'user',
        display_name: user.email?.split('@')[0] || 'User',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user?.id]);

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
      // Refresh both profile and photos
      await Promise.all([
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

  // Get user display name and username from profile, with fallbacks
  const displayName = userProfile?.display_name || 
                     userProfile?.username ||
                     user?.email?.split('@')[0] || 
                     'User';
  const username = userProfile?.username || 
                  user?.email?.split('@')[0] || 
                  'user';
  
  // Get initials for profile picture
  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const initials = getInitials(displayName);

  // Calculate stats from actual data
  const stats = {
    rollsCreated: 0, // TODO: Fetch from rolls
    photosTaken: userPhotos?.length || 0,
    memoriesShared: userPhotos?.filter(p => p.rolls?.is_public).length || 0,
  };

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
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicture}>
                <Text style={styles.profileInitials}>{initials}</Text>
              </View>
            )}
          </View>
          
          {/* User Name */}
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.rollsCreated}</Text>
              <Text style={styles.statLabel}>Rolls Created</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.photosTaken}</Text>
              <Text style={styles.statLabel}>Photos Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.memoriesShared}</Text>
              <Text style={styles.statLabel}>Memories Shared</Text>
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
                  <Image
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
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.navBackground, // Teal #2DB3AA
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

export default ProfileScreen;
