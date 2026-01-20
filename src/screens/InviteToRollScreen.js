import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import {
  getRollInviteLink,
  inviteUserToRoll,
  inviteEmailToRoll,
  getRollInvites,
} from '../services/rollInvites';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

// Separate component for follower item to manage image loading state
const FollowerItem = ({ item, status, onInvite, inviting }) => {
  const [imageError, setImageError] = React.useState(false);
  const isJoined = status === 'joined';
  const isInvited = status === 'invited';
  const canInvite = status === 'not_invited';

  // Process avatar URL - ensure it's a valid public URL
  // Profile images are stored in profile-images bucket (public)
  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    
    // If it's already a full URL, return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // If it's a storage path, convert to public URL
    try {
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(avatarUrl.includes('/') ? avatarUrl : `${item.id}/${avatarUrl}`);
      return data?.publicUrl || avatarUrl;
    } catch (err) {
      console.warn('Error getting public URL for avatar:', err);
      return avatarUrl; // Fallback to original
    }
  };

  const avatarUrl = item.avatar_url ? getAvatarUrl(item.avatar_url) : null;

  return (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        {avatarUrl && !imageError ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>
            {item.display_name || item.username || 'Unknown'}
          </Text>
          {item.username && (
            <Text style={styles.userHandle}>@{item.username}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.inviteButton,
          isJoined && styles.joinedButton,
          isInvited && styles.invitedButton,
          !canInvite && styles.disabledButton,
        ]}
        onPress={() => canInvite && onInvite(item.id)}
        disabled={!canInvite || inviting}
      >
        {inviting ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text
            style={[
              styles.inviteButtonText,
              (isJoined || isInvited) && styles.inviteButtonTextJoined,
            ]}
          >
            {isJoined ? 'Joined' : isInvited ? 'Invited' : 'Invite'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const InviteToRollScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { rollId, rollName } = route.params || {};
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('link'); // 'link', 'users', 'email'
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingInvites, setExistingInvites] = useState([]);
  const [contributors, setContributors] = useState([]);

  // Load followers and contributors
  useEffect(() => {
    loadFollowers();
    loadContributors();
    loadExistingInvites();
  }, [rollId]);

  const loadFollowers = async () => {
    try {
      setLoadingFollowers(true);
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following:following_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      const followerList = (data || [])
        .map(item => item.following)
        .filter(Boolean);

      setFollowers(followerList);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadContributors = async () => {
    try {
      const { data, error } = await supabase
        .from('roll_contributors')
        .select('user_id')
        .eq('roll_id', rollId);

      if (error) throw error;
      setContributors((data || []).map(c => c.user_id));
    } catch (error) {
      console.error('Error loading contributors:', error);
    }
  };

  const loadExistingInvites = async () => {
    try {
      const invites = await getRollInvites(rollId);
      setExistingInvites(invites || []);
    } catch (error) {
      console.error('Error loading existing invites:', error);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      const link = await getRollInviteLink(rollId);
      setInviteLink(link);
    } catch (error) {
      console.error('Error generating invite link:', error);
      const errorMessage = error.message || 'Failed to generate invite link';
      if (errorMessage.includes('CREATE_ROLL_INVITES_TABLE.sql')) {
        Alert.alert(
          'Feature Not Available',
          'Roll invites feature needs to be set up first. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) {
      await handleGenerateLink();
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      await Share.share({
        message: `You've been invited to contribute to the Roll "${rollName}" on Rolls!\n\n${inviteLink}`,
        title: 'Invite to Roll',
      });
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  const handleInviteUser = async (userId) => {
    try {
      setInviting(true);
      await inviteUserToRoll(rollId, userId);
      Alert.alert('Success', 'Invitation sent!');
      await loadExistingInvites();
    } catch (error) {
      console.error('Error inviting user:', error);
      const errorMessage = error.message || 'Failed to send invitation';
      if (errorMessage.includes('CREATE_ROLL_INVITES_TABLE.sql')) {
        Alert.alert(
          'Feature Not Available',
          'Roll invites feature needs to be set up first. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleInviteEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      const result = await inviteEmailToRoll(rollId, email.trim());
      Alert.alert(
        'Success',
        `Invitation sent to ${email}! ${result.invite_link ? '\n\nThey can join using this link: ' + result.invite_link : ''}`
      );
      setEmail('');
      await loadExistingInvites();
    } catch (error) {
      console.error('Error inviting email:', error);
      const errorMessage = error.message || 'Failed to send invitation';
      if (errorMessage.includes('CREATE_ROLL_INVITES_TABLE.sql')) {
        Alert.alert(
          'Feature Not Available',
          'Roll invites feature needs to be set up first. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const getUserInviteStatus = (userId) => {
    if (contributors.includes(userId)) return 'joined';
    const invite = existingInvites.find(
      inv => inv.invitee_user_id === userId && inv.status === 'pending'
    );
    if (invite) return 'invited';
    return 'not_invited';
  };

  const filteredFollowers = followers.filter(follower => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      follower.username?.toLowerCase().includes(query) ||
      follower.display_name?.toLowerCase().includes(query) ||
      follower.email?.toLowerCase().includes(query)
    );
  });

  const Header = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Invite Contributors</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const TabButton = ({ tab, icon, label, onPress }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tab ? colors.buttonPrimary : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabLabel,
          activeTab === tab && styles.activeTabLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFollowerItem = ({ item }) => {
    const status = getUserInviteStatus(item.id);
    return (
      <FollowerItem
        item={item}
        status={status}
        onInvite={handleInviteUser}
        inviting={inviting}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header />
      
      <View style={styles.tabContainer}>
        <TabButton
          tab="link"
          icon="link"
          label="Share Link"
          onPress={() => setActiveTab('link')}
        />
        <TabButton
          tab="users"
          icon="people"
          label="Followers"
          onPress={() => setActiveTab('users')}
        />
        <TabButton
          tab="email"
          icon="mail"
          label="Email"
          onPress={() => setActiveTab('email')}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'link' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Roll Link</Text>
            <Text style={styles.sectionDescription}>
              Generate a unique invite link that you can share via Messages, WhatsApp, email, or any other method.
            </Text>

            {inviteLink ? (
              <View style={styles.linkContainer}>
                <Text style={styles.linkText} selectable>
                  {inviteLink}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color={colors.background} />
                    <Text style={styles.generateButtonText}>Generate Link</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {inviteLink && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareLink}
              >
                <Ionicons name="share-outline" size={20} color={colors.buttonPrimary} />
                <Text style={styles.shareButtonText}>Share Link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite Followers</Text>
            <Text style={styles.sectionDescription}>
              Invite people who follow you to contribute to this Roll.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or name..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loadingFollowers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.buttonPrimary} />
              </View>
            ) : filteredFollowers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No followers found' : 'No followers yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start following people to invite them to your Rolls'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredFollowers}
                keyExtractor={(item) => item.id}
                renderItem={renderFollowerItem}
                scrollEnabled={false}
                style={styles.followersList}
              />
            )}
          </View>
        )}

        {activeTab === 'email' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Email Invite</Text>
            <Text style={styles.sectionDescription}>
              Enter an email address to send an invitation. They'll receive a link to join the Roll.
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="email@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.emailInviteButton, !email.trim() && styles.disabledButton]}
              onPress={handleInviteEmail}
              disabled={!email.trim() || inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons name="mail" size={20} color={colors.background} />
                  <Text style={styles.emailInviteButtonText}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.buttonPrimary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabLabel: {
    color: colors.buttonPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  linkContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  searchInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  emailInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  emailInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  emailInviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  followersList: {
    maxHeight: 400,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  joinedButton: {
    backgroundColor: colors.inputBackground,
  },
  invitedButton: {
    backgroundColor: colors.inputBackground,
  },
  disabledButton: {
    opacity: 0.5,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  inviteButtonTextJoined: {
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default InviteToRollScreen;
