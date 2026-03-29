import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Static mockups that mirror Rolls UI for Help Center — no bundled PNGs required.
 * Replace with real screenshots later by switching block type to `image` in helpContent.
 */

const HelpTutorialVisual = ({ variant, caption }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  let inner = null;
  switch (variant) {
    case 'rollsHeader':
      inner = (
        <View style={styles.mockScreen}>
          <View style={styles.mockHeaderRow}>
            <Text style={styles.mockHeaderTitle}>My Rolls</Text>
            <View style={styles.mockFab}>
              <Ionicons name="add" size={22} color={colors.buttonText} />
            </View>
          </View>
          <View style={styles.mockBodyMuted}>
            <Text style={styles.mockHint}>Your rolls list appears below</Text>
          </View>
        </View>
      );
      break;
    case 'rollsEmpty':
      inner = (
        <View style={styles.mockScreen}>
          <View style={styles.mockHeaderRow}>
            <Text style={styles.mockHeaderTitle}>My Rolls</Text>
            <View style={styles.mockFab}>
              <Ionicons name="add" size={22} color={colors.buttonText} />
            </View>
          </View>
          <View style={styles.mockEmptyArea}>
            <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.mockEmptyText}>No rolls yet. Create your first roll to get started!</Text>
            <View style={styles.mockPrimaryBtn}>
              <Text style={styles.mockPrimaryBtnText}>Create Roll</Text>
            </View>
          </View>
        </View>
      );
      break;
    case 'createModal':
      inner = (
        <View style={styles.mockModalOuter}>
          <View style={styles.mockModalCard}>
            <View style={styles.mockModalHeader}>
              <Text style={styles.mockModalTitle}>Create New Roll</Text>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </View>
            <View style={styles.mockModalBody}>
              <Text style={styles.mockLabel}>Roll Name *</Text>
              <View style={styles.mockInput} />
              <Text style={[styles.mockLabel, styles.mockLabelSp]}>Description (Optional)</Text>
              <View style={[styles.mockInput, styles.mockTextArea]} />
              <Text style={[styles.mockLabel, styles.mockLabelSp]}>Submission Deadline *</Text>
              <View style={styles.mockDateRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.mockDateText, styles.mockDateTextAfterIcon]}>Pick a future date</Text>
              </View>
            </View>
          </View>
        </View>
      );
      break;
    case 'createModalExtras':
      inner = (
        <View style={styles.mockModalOuter}>
          <View style={styles.mockModalCard}>
            <View style={styles.mockModalBody}>
              <Text style={styles.mockLabel}>Develop Date (Optional)</Text>
              <Text style={styles.mockHelper}>
                Photos will be hidden until this date. Must be after submission deadline.
              </Text>
              <View style={styles.mockDateRow}>
                <Ionicons name="film-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.mockDateText, styles.mockDateTextAfterIcon]}>
                  Not set (photos visible immediately)
                </Text>
              </View>
              <Text style={[styles.mockLabel, styles.mockLabelSp]}>Title Image (Optional)</Text>
              <View style={styles.mockImagePlaceholder}>
                <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.mockImagePhText}>Select Title Image</Text>
              </View>
              <View style={styles.mockToggleRow}>
                <View style={styles.mockToggleLeft}>
                  <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
                  <Text style={[styles.mockToggleLabel, styles.mockToggleLabelAfterIcon]}>
                    Make this roll public
                  </Text>
                </View>
                <View style={styles.mockSwitch} />
              </View>
              <View style={styles.mockPrimaryBtnWide}>
                <Text style={styles.mockPrimaryBtnText}>Create Roll</Text>
              </View>
            </View>
          </View>
        </View>
      );
      break;
    default:
      inner = null;
  }

  if (!inner) return null;

  return (
    <View style={styles.wrap}>
      {inner}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      marginTop: 12,
      marginBottom: 8,
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 10,
      fontStyle: 'italic',
    },
    mockScreen: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      backgroundColor: colors.background,
    },
    mockHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.inputBorder,
    },
    mockHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    mockFab: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.buttonPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mockBodyMuted: {
      paddingVertical: 28,
      paddingHorizontal: 16,
      backgroundColor: colors.backgroundLight,
      alignItems: 'center',
    },
    mockHint: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    mockEmptyArea: {
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      backgroundColor: colors.backgroundLight,
    },
    mockEmptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 12,
      marginBottom: 16,
      lineHeight: 20,
    },
    mockPrimaryBtn: {
      backgroundColor: colors.buttonPrimary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    mockPrimaryBtnWide: {
      backgroundColor: colors.buttonPrimary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    mockPrimaryBtnText: {
      color: colors.buttonText,
      fontWeight: '600',
      fontSize: 15,
    },
    mockModalOuter: {
      alignItems: 'center',
    },
    mockModalCard: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    mockModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.inputBorder,
    },
    mockModalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    mockModalBody: {
      padding: 16,
    },
    mockLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    mockLabelSp: {
      marginTop: 12,
    },
    mockInput: {
      height: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
    },
    mockTextArea: {
      height: 72,
    },
    mockDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    mockDateText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    mockDateTextAfterIcon: {
      marginLeft: 8,
      flex: 1,
    },
    mockHelper: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    mockImagePlaceholder: {
      height: 100,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBackground,
    },
    mockImagePhText: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
    },
    mockToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 8,
    },
    mockToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    mockToggleLabel: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    mockToggleLabelAfterIcon: {
      marginLeft: 8,
      flex: 1,
    },
    mockSwitch: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.inputBorder,
    },
  });

export default HelpTutorialVisual;
