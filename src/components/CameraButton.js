import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

const createStyles = (colors) =>
  StyleSheet.create({
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.cameraButtonBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -15,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    iconContainer: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const CameraButton = ({ onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Camera"
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <Ionicons name="camera" size={28} color={colors.cameraButtonIcon} />
      </View>
    </TouchableOpacity>
  );
};

export default CameraButton;
