import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import {
  fetchPrivacySettings,
  updatePrivacySettings,
  blockUserByUsername,
  listBlockedUsers,
  unblockUser,
} from '../services/privacySettings';

const MESSAGE_OPTIONS = [
  { value: 'friends', label: 'Friends' },
  { value: 'anyone', label: 'Anyone' },
];

const ROLL_JOIN_OPTIONS = [
  { value: 'friends', label: 'Friends' },
  { value: 'invite_only', label: 'Invite only' },
  { value: 'anyone', label: 'Anyone' },
];

const PrivacySettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageAllowFrom, setMessageAllowFrom] = useState('anyone');
  const [publicRollJoinPolicy, setPublicRollJoinPolicy] = useState('invite_only');
  const [blockUsername, setBlockUsername] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [blockedList, setBlockedList] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prefs, blocked] = await Promise.all([
        fetchPrivacySettings(),
        listBlockedUsers().catch(() => []),
      ]);
      setMessageAllowFrom(prefs.message_allow_from);
      setPublicRollJoinPolicy(prefs.public_roll_join_policy);
      setBlockedList(blocked);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Could not load privacy settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persistPrefs = async (nextMessage, nextRoll) => {
    try {
      setSaving(true);
      await updatePrivacySettings({
        messageAllowFrom: nextMessage,
        publicRollJoinPolicy: nextRoll,
      });
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Could not save',
        e?.message?.includes('column') || e?.code === 'PGRST204'
          ? 'Run ADD_PRIVACY_SETTINGS_AND_BLOCKS.sql in Supabase, then try again.'
          : e?.message || 'Something went wrong.'
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onMessageOption = (value) => {
    if (value === messageAllowFrom) return;
    setMessageAllowFrom(value);
    persistPrefs(value, publicRollJoinPolicy);
  };

  const onRollJoinOption = (value) => {
    if (value === publicRollJoinPolicy) return;
    setPublicRollJoinPolicy(value);
    persistPrefs(messageAllowFrom, value);
  };

  const onBlock = async () => {
    const u = blockUsername.trim();
    if (!u) {
      Alert.alert('Username required', 'Enter a username to block.');
      return;
    }
    try {
      setBlocking(true);
      await blockUserByUsername(u);
      setBlockUsername('');
      const blocked = await listBlockedUsers();
      setBlockedList(blocked);
      Alert.alert('Blocked', `@${u.replace(/^@/, '')} can no longer message you or view your profile.`);
    } catch (e) {
      Alert.alert('Could not block', e?.message || 'Try again.');
    } finally {
      setBlocking(false);
    }
  };

  const onUnblock = (blockedId, name) => {
    Alert.alert(
      'Unblock',
      `Allow ${name || 'this user'} to interact with you again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(blockedId);
              setBlockedList((prev) => prev.filter((b) => b.blockedId !== blockedId));
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not unblock.');
            }
          },
        },
      ]
    );
  };

  const refreshBlocked = async () => {
    try {
      setLoadingBlocked(true);
      const blocked = await listBlockedUsers();
      setBlockedList(blocked);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBlocked(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Who can send me a message</Text>
          <View style={styles.segmentRow}>
            {MESSAGE_OPTIONS.map((opt) => {
              const selected = messageAllowFrom === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentChip, selected && styles.segmentChipSelected]}
                  onPress={() => onMessageOption(opt.value)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.segmentChipText, selected && styles.segmentChipTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Friends means mutual followers only. Anyone allows new conversations unless you block
            someone.
          </Text>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
            Who can join my public rolls
          </Text>
          <View style={styles.segmentRowWrap}>
            {ROLL_JOIN_OPTIONS.map((opt) => {
              const selected = publicRollJoinPolicy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentChip, selected && styles.segmentChipSelected]}
                  onPress={() => onRollJoinOption(opt.value)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.segmentChipText, selected && styles.segmentChipTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Invite only: people need your invite link or a direct invite. Friends only restricts joins
            to mutual followers.
          </Text>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Block a user</Text>
          <Text style={styles.disclaimer}>
            Blocking means the other profile cannot message you or view your profile.
          </Text>
          <View style={styles.blockRow}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.inputPlaceholder}
              value={blockUsername}
              onChangeText={setBlockUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!blocking}
            />
            <TouchableOpacity
              style={[styles.blockButton, blocking && styles.blockButtonDisabled]}
              onPress={onBlock}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text style={styles.blockButtonText}>Block</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.blockedHeader}>
            <Text style={styles.blockedTitle}>Blocked accounts</Text>
            <TouchableOpacity onPress={refreshBlocked} disabled={loadingBlocked}>
              <Text style={styles.linkText}>{loadingBlocked ? '…' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
          {blockedList.length === 0 ? (
            <Text style={styles.emptyBlocked}>No blocked users</Text>
          ) : (
            blockedList.map((row) => (
              <View key={row.blockId} style={styles.blockedRow}>
                <View style={styles.blockedInfo}>
                  <Text style={styles.blockedName}>
                    @{row.username || 'unknown'}
                  </Text>
                  {row.displayName ? (
                    <Text style={styles.blockedSub}>{row.displayName}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => onUnblock(row.blockedId, row.username)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    sectionSpaced: {
      marginTop: 24,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 10,
    },
    segmentRowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    segmentChip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.background,
    },
    segmentChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
    },
    segmentChipText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentChipTextSelected: {
      color: colors.primary,
    },
    hint: {
      marginTop: 10,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    disclaimer: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    blockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
    },
    blockButton: {
      backgroundColor: colors.navBackground,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockButtonDisabled: {
      opacity: 0.6,
    },
    blockButtonText: {
      color: colors.textWhite,
      fontWeight: '700',
      fontSize: 16,
    },
    blockedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 8,
    },
    blockedTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    linkText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    },
    emptyBlocked: {
      fontSize: 14,
      color: colors.textLight,
      fontStyle: 'italic',
    },
    blockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.inputBorder,
    },
    blockedInfo: {
      flex: 1,
    },
    blockedName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    blockedSub: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    unblockText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
  });

export default PrivacySettingsScreen;
