import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { supabase, supabaseProjectHostname } from '../lib/supabase';
import {
  parseSupabaseAuthTokensFromUrl,
  parseSupabaseAuthCodeFromUrl,
  isPasswordResetDeepLink,
  parseSupabaseRecoveryVerifyFromUrl,
} from '../utils/authDeepLink';
import { deleteAllFcmTokensForUser } from '../services/fcm';

const AuthContext = React.createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  /** Set when opening rollsapp://roll/invite/... while logged out, or when tapping Join before login */
  const [pendingInviteToken, setPendingInviteToken] = useState(null);
  /** True if user tapped "Yes, join" before login — after login we auto-accept without a second tap */
  const [pendingInviteAcceptAfterLogin, setPendingInviteAcceptAfterLogin] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const handlingRecoveryUrl = useRef(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (e) {
      console.warn('AuthContext: could not load users profile row', e?.message || e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user?.id ?? null);
  }, [user?.id, loadProfile]);

  useEffect(() => {
    loadProfile(user?.id ?? null);
  }, [user?.id, loadProfile]);

  const consumeAuthDeepLink = useCallback(async (url) => {
    if (!url) return;

    // Email "reset password" opens .../auth/v1/verify?token=...&type=recovery — no JWT in URL yet
    const verifyRecovery = parseSupabaseRecoveryVerifyFromUrl(
      url,
      supabaseProjectHostname,
    );
    if (verifyRecovery) {
      handlingRecoveryUrl.current = true;
      setPasswordRecoveryActive(true);
      try {
        const { error } = await supabase.auth.verifyOtp(verifyRecovery);
        if (error) {
          console.warn('verifyOtp recovery failed', error.message);
          handlingRecoveryUrl.current = false;
          setPasswordRecoveryActive(false);
          return;
        }
      } catch (e) {
        console.warn('verifyOtp recovery', e);
        handlingRecoveryUrl.current = false;
        setPasswordRecoveryActive(false);
      }
      return;
    }

    const tokens = parseSupabaseAuthTokensFromUrl(url);
    if (tokens?.access_token && tokens.refresh_token) {
      const isRecovery =
        tokens.type === 'recovery' || isPasswordResetDeepLink(url);
      handlingRecoveryUrl.current = isRecovery;
      if (isRecovery) setPasswordRecoveryActive(true);

      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        console.warn('setSession from deep link failed', error.message);
        handlingRecoveryUrl.current = false;
        if (isRecovery) setPasswordRecoveryActive(false);
        return;
      }
      if (!isRecovery) handlingRecoveryUrl.current = false;
      return;
    }

    const code = parseSupabaseAuthCodeFromUrl(url);
    if (code && isPasswordResetDeepLink(url)) {
      handlingRecoveryUrl.current = true;
      setPasswordRecoveryActive(true);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn('exchangeCodeForSession failed', error.message);
          handlingRecoveryUrl.current = false;
          setPasswordRecoveryActive(false);
          return;
        }
      } catch (e) {
        console.warn('exchangeCodeForSession', e);
        handlingRecoveryUrl.current = false;
        setPasswordRecoveryActive(false);
      }
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) consumeAuthDeepLink(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      consumeAuthDeepLink(url);
    });
    return () => sub.remove();
  }, [consumeAuthDeepLink]);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryActive(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecoveryActive(false);
        handlingRecoveryUrl.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecoveryActive(false);
    handlingRecoveryUrl.current = false;
  }, []);

  const clearPendingInviteToken = useCallback(() => {
    setPendingInviteToken(null);
  }, []);

  const signOut = async () => {
    try {
      const uid = user?.id;
      if (uid) {
        await deleteAllFcmTokensForUser(uid);
      }
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setPendingInviteToken(null);
      setPendingInviteAcceptAfterLogin(false);
      setPasswordRecoveryActive(false);
      handlingRecoveryUrl.current = false;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    profile,
    profileLoading,
    refreshProfile,
    passwordRecoveryActive,
    clearPasswordRecovery,
    pendingInviteToken,
    setPendingInviteToken,
    clearPendingInviteToken,
    pendingInviteAcceptAfterLogin,
    setPendingInviteAcceptAfterLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
