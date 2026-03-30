import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { deleteMyAccount } from '../services/accountDeletion';

const CONFIRM_PHRASE = 'DELETE';

const DataPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canSubmit = confirmText.trim() === CONFIRM_PHRASE && !deleting;

  const onDeleteAccount = () => {
    if (!canSubmit) return;

    Alert.alert(
      'Delete account permanently?',
      'This removes your profile, rolls, photos, messages, and stored images. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccount();
              Alert.alert(
                'Account deleted',
                'Your data has been removed. Thank you for using Rolls.'
              );
            } catch (e) {
              console.error(e);
              Alert.alert(
                'Deletion failed',
                e?.message || 'Could not complete deletion. Try again or contact support.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data & privacy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          This page describes how we handle your personal data and how you can request complete
          deletion of your account and content (including under GDPR and CCPA-style rights).
        </Text>

        <Text style={styles.sectionTitle}>Data we process</Text>
        <Text style={styles.paragraph}>
          • Account details you provide (e.g. email, username, display name, profile text).{'\n'}
          • Content you create (rolls, photos, captions, comments, likes).{'\n'}
          • Social data such as follows and blocks.{'\n'}
          • Messages you send or receive in the app.{'\n'}
          • Technical data needed to run the service (e.g. authentication tokens, device/session
          data as processed by our backend provider).
        </Text>

        <Text style={styles.sectionTitle}>Your rights</Text>
        <Text style={styles.paragraph}>
          Depending on where you live, you may have rights to access, correct, delete, or export
          your personal data, and to object to or restrict certain processing. You can delete your
          account and data below without contacting us. For other requests, use Contact Support in
          the Profile tab.
        </Text>

        <Text style={styles.sectionTitle}>Delete your account and data</Text>
        <Text style={styles.paragraph}>
          When you delete your account, we remove your profile data and associated content from our
          systems and delete stored images tied to your account where our app can reach them.
          Authentication and database removal are performed together so your login no longer works.
        </Text>
        <Text style={styles.warning}>
          This action is permanent and cannot be undone.
        </Text>

        <Text style={styles.inputLabel}>Type {CONFIRM_PHRASE} to enable deletion</Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={CONFIRM_PHRASE}
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!deleting}
        />

        <TouchableOpacity
          style={[styles.deleteButton, (!canSubmit || deleting) && styles.deleteButtonDisabled]}
          onPress={onDeleteAccount}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.deleteButtonText}>Delete my account and data</Text>
          )}
        </TouchableOpacity>
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 12,
    },
    backButton: {
      padding: 8,
      width: 44,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
    },
    headerRight: {
      width: 44,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    lead: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 8,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    warning: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.error,
      marginBottom: 20,
      lineHeight: 22,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      marginBottom: 16,
    },
    deleteButton: {
      backgroundColor: colors.buttonSecondary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonDisabled: {
      opacity: 0.45,
    },
    deleteButtonText: {
      color: colors.textWhite,
      fontWeight: '700',
      fontSize: 16,
    },
  });

export default DataPolicyScreen;
