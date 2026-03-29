import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import {
  APP_VERSION,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from '../constants/about';

const TAGLINE =
  'Share photo rolls with friends — capture moments, build rolls together, and keep everything in one place.';

const AboutRollsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const openLink = useCallback((url, missingTitle) => {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    if (!trimmed) {
      Alert.alert(
        missingTitle,
        'This link will be available once a policy is published. You can also reach out from Contact Support on your profile.',
      );
      return;
    }
    Linking.openURL(trimmed).catch(() => {
      Alert.alert('Error', 'Could not open the link.');
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Rolls</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.appName}>Rolls</Text>
            <Text style={styles.tagline}>{TAGLINE}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowPlain}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowLink}
            onPress={() => openLink(PRIVACY_POLICY_URL, 'Privacy Policy')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLinkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.rowLink}
            onPress={() => openLink(TERMS_OF_USE_URL, 'Terms of Use')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLinkText}>Terms of Use</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeading}>Help</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowLink}
            onPress={() => navigation.navigate('HelpCenter')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLinkLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLinkText}>Help & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          For account questions or feedback, use Contact Support on your profile.
        </Text>
        <Text style={styles.copyright}>© {year} Rolls</Text>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      overflow: 'hidden',
    },
    cardBody: {
      padding: 16,
    },
    appName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    tagline: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    rowPlain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    rowValue: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    sectionHeading: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      marginLeft: 4,
    },
    rowLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowLinkLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rowIcon: {
      marginRight: 10,
    },
    rowLinkText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.inputBorder,
      marginLeft: 16,
    },
    footerNote: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    copyright: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    bottomSpacing: {
      height: 32,
    },
  });

export default AboutRollsScreen;
