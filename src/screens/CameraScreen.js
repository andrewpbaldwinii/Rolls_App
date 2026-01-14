import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  AppState,
  PermissionsAndroid,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useRolls } from '../contexts/RollsContext';
import { uploadRollImage } from '../services/storage';
import colors from '../constants/colors';

const CameraScreen = () => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const isMountedRef = useRef(true);
  const { hasPermission, requestPermission } = useCameraPermission();
  const { addImageToRoll, getOwnedRolls, getContributedRolls, fetchRolls } = useRolls();
  const device = useCameraDevice('back');
  const [isActive, setIsActive] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [showRollSelector, setShowRollSelector] = useState(false);
  const [uploading, setUploading] = useState(false);

  const ownedRolls = getOwnedRolls();
  const contributedRolls = getContributedRolls();
  const availableRolls = [...ownedRolls, ...contributedRolls].filter(
    roll => (roll?.status || '').toLowerCase() !== 'archived'
  );

  // Ensure rolls are fresh when entering the camera screen
  useEffect(() => {
    fetchRolls();
  }, [fetchRolls]);

  // Refresh rolls when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchRolls();
    }, [fetchRolls])
  );

  useEffect(() => {
    // Request camera permission on mount
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    // Activate camera when component mounts, deactivate when unmounts
    setIsActive(true);
    isMountedRef.current = true;
    return () => {
      setIsActive(false);
      isMountedRef.current = false;
    };
  }, []);

  // Auto-select first roll if available
  useEffect(() => {
    if (availableRolls.length > 0 && !selectedRoll) {
      setSelectedRoll(availableRolls[0]);
    }
  }, [availableRolls.length]);

  // Refresh rolls when selector opens to ensure new rolls appear
  useEffect(() => {
    if (showRollSelector) {
      fetchRolls();
    }
  }, [showRollSelector, fetchRolls]);

  const takePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant camera permission to take photos');
      const result = await requestPermission();
      if (!result) {
        return;
      }
    }

    // Check if a roll is selected
    if (!selectedRoll) {
      if (availableRolls.length === 0) {
        Alert.alert(
          'No Rolls Available',
          'Please create a roll first before taking photos.',
          [{ text: 'OK' }]
        );
        return;
      }
      setShowRollSelector(true);
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'speed',
      });
      
      // Show confirmation dialog before uploading
      Alert.alert(
        'Confirm Upload',
        `Add this photo to "${selectedRoll.title}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsCapturing(false),
          },
          {
            text: 'Upload',
            onPress: () => handlePhotoUpload(photo.path),
          },
        ]
      );
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsCapturing(false);
    }
  };

  const handlePhotoUpload = async (imagePath, base64Data = null) => {
    try {
      setUploading(true);
      
      // Validate selectedRoll
      if (!selectedRoll || !selectedRoll.id) {
        Alert.alert('Error', 'No roll selected. Please select a roll first.');
        setIsCapturing(false);
        setUploading(false);
        return;
      }

      console.log('📸 Starting photo upload process...', { 
        rollId: selectedRoll.id, 
        rollTitle: selectedRoll.title,
        rollIdType: typeof selectedRoll.id,
        imagePath: imagePath?.substring(0, 50) + '...', 
        hasBase64: !!base64Data 
      });
      
      // Upload image to Supabase Storage
      console.log('Step 1: Uploading image to storage...');
      const imageUrl = await uploadRollImage(selectedRoll.id, imagePath, base64Data);
      console.log('✅ Step 1 complete: Image uploaded, URL:', imageUrl);
      
      if (!isMountedRef.current) return; // Component unmounted, don't continue
      
      // Add image to roll
      console.log('Step 2: Adding image to roll_images table...');
      await addImageToRoll(selectedRoll.id, imageUrl);
      console.log('Step 2 complete: Image added to roll');
      
      if (!isMountedRef.current) return; // Component unmounted, don't show alert
      
      // Always show success message
      Alert.alert(
        'Success! ✅',
        `Photo added to "${selectedRoll.title}"`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error uploading photo:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error keys:', Object.keys(error || {}));
      
      // Better error extraction
      let errorDetails = {};
      try {
        errorDetails = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        errorDetails = { message: String(error) };
      }
      console.error('Error details:', errorDetails);
      
      if (!isMountedRef.current) return; // Component unmounted, don't show alert
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload photo. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error) {
        errorMessage = String(error.error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (errorDetails?.message) {
        errorMessage = errorDetails.message;
      } else if (error) {
        errorMessage = `Upload failed. Check console for details.`;
      }
      
      // Show error alert
      if (isMountedRef.current) {
        Alert.alert('Upload Error', errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        setIsCapturing(false);
      }
    }
  };

  const selectImageFromDevice = async () => {
    // Check if a roll is selected
    if (!selectedRoll) {
      if (availableRolls.length === 0) {
        Alert.alert(
          'No Rolls Available',
          'Please create a roll first before uploading photos.',
          [{ text: 'OK' }]
        );
        return;
      }
      setShowRollSelector(true);
      return;
    }

    // Request permissions for Android
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        let permission;
        
        if (apiLevel >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }

        const granted = await PermissionsAndroid.request(permission);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required',
            'Please grant photo access permission to select images from your device.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (err) {
        console.error('Permission error:', err);
        Alert.alert('Error', 'Failed to request photo permission');
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

    try {
      launchImageLibrary(options, async (response) => {
        if (response.didCancel) {
          return;
        }

        if (response.errorCode) {
          console.error('Image picker error:', response.errorCode, response.errorMessage);
          let errorMessage = 'Failed to select image';
          if (response.errorCode === 'permission') {
            errorMessage = 'Permission to access photos was denied. Please enable it in your device settings.';
          } else if (response.errorMessage) {
            errorMessage = response.errorMessage;
          }
          Alert.alert('Error', errorMessage);
          return;
        }

        if (response.assets && response.assets[0]) {
          const selectedImage = response.assets[0];
          console.log('Image selected from device:', {
            uri: selectedImage.uri?.substring(0, 50) + '...',
            hasBase64: !!selectedImage.base64,
            type: selectedImage.type,
          });

          // Show confirmation dialog
          Alert.alert(
            'Confirm Upload',
            `Add this photo to "${selectedRoll.title}"?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Upload',
                onPress: () => handlePhotoUpload(selectedImage.uri, selectedImage.base64),
              },
            ]
          );
        }
      });
    } catch (error) {
      console.error('Error launching image library:', error);
      Alert.alert('Error', 'Failed to open photo picker. Please try again.');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to use this feature
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={true}
      />
      
      {/* Backdrop to close dropdown */}
      {showRollSelector && (
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowRollSelector(false)}
        />
      )}

      {/* Roll Selector - Always visible and prominent */}
      <View style={[styles.rollSelectorContainer, { top: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.rollSelectorButton}
          onPress={() => {
            fetchRolls(); // Refresh rolls before opening
            setShowRollSelector(!showRollSelector);
          }}
          activeOpacity={0.8}
        >
          <View style={[
            styles.rollSelectorContent,
            selectedRoll && styles.rollSelectorContentSelected
          ]}>
            <Ionicons 
              name={selectedRoll ? "camera" : "camera-outline"} 
              size={18} 
              color={selectedRoll ? colors.buttonText : colors.textPrimary} 
            />
            <Text style={[styles.rollSelectorText, selectedRoll && styles.rollSelectorTextSelected]} numberOfLines={1}>
              {selectedRoll ? selectedRoll.title : 'Select Roll'}
            </Text>
            <Ionicons 
              name={showRollSelector ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={selectedRoll ? colors.buttonText : colors.textPrimary} 
            />
          </View>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {showRollSelector && availableRolls.length > 0 && (
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownContent}>
              {availableRolls.map((roll) => (
                <TouchableOpacity
                  key={roll.id}
                  style={[
                    styles.dropdownItem,
                    selectedRoll?.id === roll.id && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedRoll(roll);
                    setShowRollSelector(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selectedRoll?.id === roll.id ? "checkmark-circle" : "camera-outline"}
                    size={20}
                    color={selectedRoll?.id === roll.id ? colors.buttonPrimary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.dropdownItemText,
                    selectedRoll?.id === roll.id && styles.dropdownItemTextSelected
                  ]}>
                    {roll.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showRollSelector && availableRolls.length === 0 && (
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownContent}>
              <View style={styles.dropdownEmpty}>
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.dropdownEmptyText}>No active rolls</Text>
                <Text style={styles.dropdownEmptySubtext}>Create a roll first</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Capture Button Overlay */}
      <View style={[styles.overlay, { paddingBottom: insets.bottom + 20 }]}>
        {/* Image Picker Button */}
        <TouchableOpacity
          style={[styles.imagePickerButton, (isCapturing || uploading) && styles.imagePickerButtonDisabled]}
          onPress={selectImageFromDevice}
          disabled={isCapturing || uploading}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={28} color={colors.buttonText} />
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={[styles.captureButton, (isCapturing || uploading) && styles.captureButtonActive]}
          onPress={takePhoto}
          disabled={isCapturing || uploading}
          activeOpacity={0.8}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        {/* Spacer for symmetry */}
        <View style={styles.imagePickerButton} />
        
        {(isCapturing || uploading) && (
          <ActivityIndicator size="small" color={colors.buttonText} style={styles.capturingIndicator} />
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  rollSelectorContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  rollSelectorButton: {
    width: '100%',
  },
  rollSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.buttonPrimary,
  },
  rollSelectorContentSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: colors.buttonPrimary,
  },
  rollSelectorText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  rollSelectorTextSelected: {
    color: colors.buttonText,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  dropdownContainer: {
    marginTop: 8,
    zIndex: 20,
  },
  dropdownContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  dropdownItemSelected: {
    backgroundColor: colors.inputBackground,
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: colors.buttonPrimary,
    fontWeight: '600',
  },
  dropdownEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  dropdownEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonActive: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.buttonPrimary,
  },
  imagePickerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.buttonPrimary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  imagePickerButtonDisabled: {
    opacity: 0.5,
  },
  capturingIndicator: {
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CameraScreen;
