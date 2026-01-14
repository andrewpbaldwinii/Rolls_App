import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadProfileImage } from '../services/publicProfile';
import colors from '../constants/colors';

const EditProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, display_name, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUsername(data?.username || '');
      setEmail(data?.email || user?.email || '');
      setAvatarUrl(data?.avatar_url || null);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions automatically
    }

    try {
      // For Android 13+ (API 33+), use READ_MEDIA_IMAGES
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Access Permission',
            message: 'Rolls needs access to your photos to set your profile picture.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // For Android < 13, use READ_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Rolls needs access to your storage to select photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const handleImagePicker = async () => {
    console.log('handleImagePicker called - Button was pressed!');
    
    // Check if launchImageLibrary is available
    if (!launchImageLibrary) {
      Alert.alert('Error', 'Image picker library is not available. The app needs to be rebuilt.');
      console.error('launchImageLibrary is not available');
      return;
    }

    // Request permissions for Android - BLOCK until permission is granted
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Photo access permission is required to select images from your Photos app.\n\nPlease grant permission and try again.',
            [{ text: 'OK' }]
          );
          return; // Don't proceed without permission
        }
        console.log('Permission granted, opening photo picker...');
      } catch (err) {
        console.error('Permission request failed:', err);
        Alert.alert('Error', 'Failed to request photo permission. Please try again.');
        return;
      }
    }
    
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 1,
      includeBase64: true, // Get base64 data to avoid content:// URI issues on Android
      presentationStyle: 'pageSheet', // For iOS
    };

    console.log('Launching image library with options:', options);
    console.log('Platform:', Platform.OS, 'Version:', Platform.Version);

    try {
      launchImageLibrary(options, (response) => {
        console.log('Image picker response received:', JSON.stringify(response, null, 2));
        
        if (response.didCancel) {
          console.log('User cancelled image picker');
          return;
        }

        if (response.errorCode) {
          console.error('Image picker error:', response.errorCode, response.errorMessage);
          let errorMessage = 'Failed to pick image';
          if (response.errorCode === 'permission') {
            errorMessage = 'Permission to access photos was denied. Please enable it in your device settings (Settings > Apps > Rolls > Permissions > Photos).';
          } else if (response.errorCode === 'others') {
            errorMessage = response.errorMessage || 'An error occurred while selecting the image.';
          } else if (response.errorMessage) {
            errorMessage = response.errorMessage;
          }
          Alert.alert('Error', errorMessage);
          return;
        }

        if (response.assets && response.assets[0]) {
          const selectedImage = response.assets[0];
          console.log('Image selected successfully:', {
            uri: selectedImage.uri?.substring(0, 50) + '...',
            hasBase64: !!selectedImage.base64,
            base64Length: selectedImage.base64?.length || 0,
            type: selectedImage.type,
          });
          // Store both URI and base64 data for upload
          setProfileImageUri({
            uri: selectedImage.uri,
            base64: selectedImage.base64, // Available when includeBase64: true
            type: selectedImage.type,
          });
          // Don't show success alert - just update the preview
        } else {
          console.warn('No image assets in response:', response);
          // Only show error if there was actually an error, not if user just cancelled
          if (!response.didCancel) {
            Alert.alert('Error', 'No image was selected. Please try again.');
          }
        }
      });
    } catch (error) {
      console.error('Error launching image library:', error);
      Alert.alert('Error', `Failed to open image picker: ${error.message}\n\nPlease make sure the app has been rebuilt after installing react-native-image-picker.`);
    }
  };

  const uploadProfilePicture = async (imageData) => {
    try {
      setUploadingImage(true);
      
      // Log what we're receiving
      console.log('Uploading profile picture, imageData:', {
        hasUri: !!imageData.uri,
        hasBase64: !!imageData.base64,
        uri: imageData.uri?.substring(0, 50) + '...',
        base64Length: imageData.base64?.length || 0,
      });
      
      // Pass both URI and base64 if available
      const imageUrl = await uploadProfileImage(
        user.id, 
        imageData.uri || imageData,
        imageData.base64 // Pass base64 if available
      );
      setAvatarUrl(imageUrl);
      setProfileImageUri(null); // Clear local data after upload
      return imageUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      console.error('Error stack:', error.stack);
      // Re-throw with more context
      const errorMessage = error.message || 'Unknown error occurred while uploading image';
      throw new Error(`Failed to upload profile image: ${errorMessage}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setSaving(true);

    try {
      // 1. Upload profile picture if selected
      let finalAvatarUrl = avatarUrl;
      if (profileImageUri) {
        // Pass the full object (with uri and base64) to upload function
        const imageData = typeof profileImageUri === 'string' 
          ? { uri: profileImageUri }
          : profileImageUri;
        finalAvatarUrl = await uploadProfilePicture(imageData);
      }

      // 2. Update username and display_name
      const { error: profileError } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          display_name: username.trim(), // Keep them in sync
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id);

      if (profileError) {
        // Check if username is taken
        if (profileError.code === '23505' || profileError.message?.includes('unique')) {
          Alert.alert('Error', 'This username is already taken. Please choose a different one.');
          setSaving(false);
          return;
        }
        throw profileError;
      }

      // 3. Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (emailError) {
          Alert.alert('Error', `Failed to update email: ${emailError.message}`);
          setSaving(false);
          return;
        }
      }

      // 4. Update password if provided
      if (newPassword) {
        if (!currentPassword) {
          Alert.alert('Error', 'Please enter your current password to change it');
          setSaving(false);
          return;
        }

        // First verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          Alert.alert('Error', 'Current password is incorrect');
          setSaving(false);
          return;
        }

        // Update password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          Alert.alert('Error', `Failed to update password: ${passwordError.message}`);
          setSaving(false);
          return;
        }
      }

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderProfileImage = () => {
    // Handle both string URI and object with uri/base64
    const imageUri = typeof profileImageUri === 'string' 
      ? profileImageUri 
      : profileImageUri?.uri;
    
    const imageSource = imageUri
      ? { uri: imageUri }
      : avatarUrl
      ? { uri: avatarUrl }
      : null;

    if (imageSource) {
      return <Image source={imageSource} style={styles.profileImage} />;
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
        <Text style={styles.profileInitials}>{getInitials(username || 'User')}</Text>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              {uploadingImage ? (
                <View style={styles.profileImage}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                renderProfileImage()
              )}
              <TouchableOpacity
                style={styles.editImageButton}
                onPress={() => {
                  console.log('Camera button pressed');
                  handleImagePicker();
                }}
                disabled={uploadingImage}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={20} color={colors.textWhite} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileImageHint}>
              Tap the camera icon to upload a photo from your device
            </Text>
          </View>
        </View>

        {/* Username Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Username can only contain letters, numbers, and underscores (min 3 characters)
          </Text>
        </View>

        {/* Email Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Changing your email will require verification
          </Text>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={colors.textSecondary}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            placeholder="New password (leave blank to keep current)"
            placeholderTextColor={colors.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {newPassword ? (
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          <Text style={styles.hint}>
            Leave password fields blank if you don't want to change your password
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textWhite} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

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
  scrollContent: {
    padding: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textWhite,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  profileImageHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputSpacing: {
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default EditProfileScreen;

