import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../contexts/AuthContext';
import {
  getRollInviteLink,
  inviteUserToRoll,
  inviteEmailToRoll,
} from '../services/rollInvites';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputBorder,
    },
    backButton: {
      padding: 4,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    cardDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    linkBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    linkText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    linkCopyHint: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.buttonPrimary,
      paddingVertical: 12,
      borderRadius: 10,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.buttonText,
      marginLeft: 8,
    },
    qrWrap: {
      alignItems: 'center',
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
      marginBottom: 12,
    },
    qrHint: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    disabledBtn: {
      opacity: 0.45,
    },
    warnCard: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warnText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    centerLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const InviteContributorsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, loading: authLoading } = useAuth();

  const { rollId, rollName } = route.params || {};

  const [loadingLink, setLoadingLink] = useState(true);
  const [inviteLink, setInviteLink] = useState(null);
  const [linkError, setLinkError] = useState(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [invitingUser, setInvitingUser] = useState(false);
  const [invitingEmail, setInvitingEmail] = useState(false);

  const loadInviteLink = useCallback(async () => {
    if (!rollId || !user?.id) return;
    setLoadingLink(true);
    setLinkError(null);
    try {
      const link = await getRollInviteLink(rollId);
      setInviteLink(link);
    } catch (e) {
      console.error('Invite link error:', e);
      setLinkError(e.message || 'Could not create invite link');
      setInviteLink(null);
    } finally {
      setLoadingLink(false);
    }
  }, [rollId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (!rollId) return;
    loadInviteLink();
  }, [user?.id, rollId, loadInviteLink]);

  useEffect(() => {
    if (!rollId) {
      navigation.goBack();
      return;
    }
    if (authLoading) return;
    if (!user?.id) {
      Alert.alert('Sign in required', 'Log in to invite contributors to this roll.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [user?.id, rollId, navigation, authLoading]);

  const handleShareLink = async () => {
    if (!inviteLink) {
      await loadInviteLink();
      return;
    }
    try {
      await Share.share({
        message: `You're invited to contribute to "${rollName || 'a Roll'}" on Rolls.\n\nOpen in the Rolls app:\n${inviteLink}`,
        title: 'Roll invite',
      });
    } catch (e) {
      console.warn('Share cancelled or failed', e);
    }
  };

  const normalizeUsername = (raw) => {
    let s = raw.trim();
    if (s.startsWith('@')) s = s.slice(1);
    return s;
  };

  const handleInviteByUsername = async () => {
    const u = normalizeUsername(usernameInput);
    if (!u) {
      Alert.alert('Username', 'Enter a username.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      Alert.alert('Username', 'Usernames can only contain letters, numbers, and underscores.');
      return;
    }

    setInvitingUser(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('username', u)
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) {
        Alert.alert('Not found', `No user with username "${u}".`);
        return;
      }
      if (data.id === user.id) {
        Alert.alert('Invite', "You can't invite yourself.");
        return;
      }

      await inviteUserToRoll(rollId, data.id);
      Alert.alert(
        'Invited',
        `${data.display_name || data.username} can accept from Notifications or when they open the roll.`,
      );
      setUsernameInput('');
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Invite failed';
      if (msg.includes('CREATE_ROLL_INVITES_TABLE')) {
        Alert.alert(
          'Setup required',
          'Run CREATE_ROLL_INVITES_TABLE.sql in Supabase to enable invites.',
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setInvitingUser(false);
    }
  };

  const handleInviteByEmail = async () => {
    const email = emailInput.trim();
    if (!email) {
      Alert.alert('Email', 'Enter an email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Email', 'Enter a valid email address.');
      return;
    }

    setInvitingEmail(true);
    try {
      await inviteEmailToRoll(rollId, email);
      Alert.alert(
        'Invite recorded',
        'They can join the Rolls app and accept using the invite link you share or their account.',
      );
      setEmailInput('');
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Invite failed';
      if (msg.includes('CREATE_ROLL_INVITES_TABLE')) {
        Alert.alert(
          'Setup required',
          'Run CREATE_ROLL_INVITES_TABLE.sql in Supabase to enable invites.',
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setInvitingEmail(false);
    }
  };

  if (!rollId || authLoading || !user?.id) {
    return (
      <View style={[styles.container, styles.centerLoading]}>
        <ActivityIndicator color={colors.buttonPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Invite contributors</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {rollName || 'This roll'}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>
            Invited people open the link or scan the QR in the Rolls app, then accept the invite to contribute.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="link" size={22} color={colors.buttonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Invite link</Text>
          </View>
          <Text style={styles.cardDescription}>
            Unique link for this roll. Share it in messages or email. Recipients need the Rolls app to accept.
          </Text>
          {loadingLink ? (
            <ActivityIndicator color={colors.buttonPrimary} style={{ marginVertical: 16 }} />
          ) : linkError ? (
            <>
              <Text style={[styles.cardDescription, { color: colors.error, marginBottom: 12 }]}>{linkError}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={loadInviteLink}>
                <Text style={[styles.primaryBtnText, { marginLeft: 0 }]}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} selectable>
                  {inviteLink}
                </Text>
              </View>
              <Text style={styles.linkCopyHint}>
                Long-press the link above to copy it. Or share below.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleShareLink}>
                <Ionicons name="share-outline" size={18} color={colors.buttonText} />
                <Text style={styles.primaryBtnText}>Share link</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="qr-code" size={22} color={colors.buttonPrimary} />
            </View>
            <Text style={styles.cardTitle}>QR code</Text>
          </View>
          <Text style={styles.cardDescription}>
            Encodes the same invite link. Scan with a phone that can open custom app links.
          </Text>
          {loadingLink || !inviteLink ? (
            <ActivityIndicator color={colors.buttonPrimary} style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.qrWrap}>
              <QRCode
                value={inviteLink}
                size={200}
                color={colors.textPrimary}
                backgroundColor={colors.background}
              />
              <Text style={styles.qrHint}>Scan to open the invite in Rolls</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="person-add-outline" size={22} color={colors.buttonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Invite by username</Text>
          </View>
          <Text style={styles.cardDescription}>
            Invite someone who already uses Rolls. They must accept the invite in the app.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="username (without @)"
            placeholderTextColor={colors.inputPlaceholder}
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!usernameInput.trim() || invitingUser) && styles.disabledBtn]}
            onPress={handleInviteByUsername}
            disabled={!usernameInput.trim() || invitingUser}
          >
            {invitingUser ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={colors.buttonText} />
                <Text style={styles.primaryBtnText}>Send invite</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="mail-outline" size={22} color={colors.buttonPrimary} />
            </View>
            <Text style={styles.cardTitle}>Invite by email</Text>
          </View>
          <Text style={styles.cardDescription}>
            Records the invite for this roll. Share the link above so they can open it in Rolls after signing up.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!emailInput.trim() || invitingEmail) && styles.disabledBtn]}
            onPress={handleInviteByEmail}
            disabled={!emailInput.trim() || invitingEmail}
          >
            {invitingEmail ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="mail" size={18} color={colors.buttonText} />
                <Text style={styles.primaryBtnText}>Send email invite</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default InviteContributorsScreen;
