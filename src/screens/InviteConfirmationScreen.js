import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { acceptRollInviteByToken, declineRollInvite } from '../services/rollInvites';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';
import OptimizedImage from '../components/OptimizedImage';

const InviteConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { inviteToken } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [roll, setRoll] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }
    loadInviteDetails();
  }, [inviteToken]);

  const loadInviteDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Find the invite by token
      const { data: invite, error: inviteError } = await supabase
        .from('roll_invites')
        .select(`
          *,
          roll:rolls(*),
          inviter:users!roll_invites_inviter_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invite) {
        throw new Error('Invite not found or already processed');
      }

      setRoll(invite.roll);
      setInviter(invite.inviter);
    } catch (err) {
      console.error('Error loading invite details:', err);
      setError(err.message || 'Failed to load invite details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login
      navigation.navigate('Login');
      return;
    }

    try {
      setProcessing(true);
      const rollId = await acceptRollInviteByToken(inviteToken);
      
      // Navigate to the roll detail screen
      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainTabs' },
          {
            name: 'RollDetail',
            params: { rollId },
          },
        ],
      });
    } catch (err) {
      console.error('Error accepting invite:', err);
      Alert.alert('Error', err.message || 'Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      setProcessing(true);
      // For link-based invites, we don't need to mark as declined
      // Just navigate away
      navigation.goBack();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs');
      }
    } catch (err) {
      console.error('Error declining invite:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </View>
    );
  }

  if (error || !roll || !inviter) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorText}>
            {error || 'This invitation link is invalid or has already been used.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Roll Invitation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inviteCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-open" size={48} color={colors.buttonPrimary} />
          </View>

          <Text style={styles.title}>You've been invited!</Text>
          
          <Text style={styles.description}>
            You've been invited to contribute photos to this Roll
          </Text>

          {/* Inviter Info */}
          <View style={styles.inviterSection}>
            <Text style={styles.inviterLabel}>Invited by</Text>
            <View style={styles.inviterRow}>
              {inviter.avatar_url ? (
                <OptimizedImage
                  source={{ uri: inviter.avatar_url }}
                  style={styles.inviterAvatar}
                />
              ) : (
                <View style={[styles.inviterAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={20} color={colors.textSecondary} />
                </View>
              )}
              <Text style={styles.inviterName}>
                {inviter.display_name || inviter.username || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Roll Info */}
          <View style={styles.rollSection}>
            <View style={styles.rollCard}>
              {roll.title_image_url ? (
                <OptimizedImage
                  source={{ uri: roll.title_image_url }}
                  style={styles.rollImage}
                />
              ) : (
                <View style={[styles.rollImage, styles.rollImagePlaceholder]}>
                  <Ionicons name="images" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.rollInfo}>
                <Text style={styles.rollTitle} numberOfLines={2}>
                  {roll.title}
                </Text>
                {roll.description && (
                  <Text style={styles.rollDescription} numberOfLines={3}>
                    {roll.description}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptButton, processing && styles.disabledButton]}
              onPress={handleAccept}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                  <Text style={styles.acceptButtonText}>Accept Invite</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineButton, processing && styles.disabledButton]}
              onPress={handleDecline}
              disabled={processing}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>

          {!user && (
            <Text style={styles.loginPrompt}>
              You'll need to log in or sign up to accept this invitation.
            </Text>
          )}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  inviteCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inviterSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  inviterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rollSection: {
    width: '100%',
    marginBottom: 24,
  },
  rollCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rollImage: {
    width: '100%',
    height: 200,
  },
  rollImagePlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollInfo: {
    padding: 16,
  },
  rollTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  rollDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  declineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loginPrompt: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default InviteConfirmationScreen;
