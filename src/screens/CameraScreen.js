import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import colors from '../constants/colors';

const CameraScreen = () => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isActive, setIsActive] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    // Request camera permission on mount
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    // Activate camera when component mounts, deactivate when unmounts
    setIsActive(true);
    return () => {
      setIsActive(false);
    };
  }, []);

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

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'speed',
      });
      
      // Photo captured successfully
      Alert.alert('Success', `Photo saved to: ${photo.path}`);
      
      // TODO: Handle the photo (upload to Supabase, save to gallery, etc.)
      console.log('Photo captured:', photo.path);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsCapturing(false);
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
      
      {/* Capture Button Overlay */}
      <View style={[styles.overlay, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
          onPress={takePhoto}
          disabled={isCapturing}
          activeOpacity={0.8}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        {isCapturing && (
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
