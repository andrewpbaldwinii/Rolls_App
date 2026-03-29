import React, { useEffect, useMemo } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet, Linking, StatusBar } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import MainNavigator from './MainNavigator';
import InviteConfirmationScreen from '../screens/InviteConfirmationScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const createAuthNavStyles = (colors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });

const AuthNavigator = ({ navigationRef }) => {
  const {
    user,
    loading,
    passwordRecoveryActive,
    pendingInviteToken,
    setPendingInviteToken,
    clearPendingInviteToken,
    pendingInviteAcceptAfterLogin,
    setPendingInviteAcceptAfterLogin,
  } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createAuthNavStyles(colors), [colors]);
  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.inputBorder,
        notification: colors.notificationBadge,
      },
    }),
    [isDark, colors],
  );

  // Roll invite deep links (AuthContext handles password reset; App.tsx does not duplicate Linking)
  useEffect(() => {
    if (loading) return;

    const parseInviteToken = (url) => {
      if (!url || !url.includes('rollsapp://roll/invite/')) return null;
      const rest = url.split('rollsapp://roll/invite/')[1] || '';
      const raw = rest.split(/[?#]/)[0]?.trim();
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    };

    const handleDeepLink = (url) => {
      const token = parseInviteToken(url);
      if (!token) return;
      if (user) {
        clearPendingInviteToken();
      } else {
        setPendingInviteToken(token);
      }
      const nav = () =>
        navigationRef.current?.navigate('InviteConfirmation', { inviteToken: token });
      if (navigationRef.current?.isReady?.()) {
        setTimeout(nav, 100);
      } else {
        setTimeout(nav, 400);
      }
    };

    Linking.getInitialURL().then((url) => url && handleDeepLink(url));
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => subscription.remove();
  }, [navigationRef, user, loading, setPendingInviteToken, clearPendingInviteToken]);

  // After login: open invite screen (preview), or with completeAfterLogin to auto-accept
  useEffect(() => {
    if (loading || !user || !pendingInviteToken) return;
    const token = pendingInviteToken;
    const acceptAfter = pendingInviteAcceptAfterLogin;
    clearPendingInviteToken();
    setPendingInviteAcceptAfterLogin(false);
    const t = setTimeout(() => {
      navigationRef.current?.navigate('InviteConfirmation', {
        inviteToken: token,
        ...(acceptAfter ? { completeAfterLogin: true } : {}),
      });
    }, 450);
    return () => clearTimeout(t);
  }, [
    user,
    loading,
    pendingInviteToken,
    pendingInviteAcceptAfterLogin,
    navigationRef,
    clearPendingInviteToken,
    setPendingInviteAcceptAfterLogin,
  ]);

  // After recovery link opens the app, session exists — stay on auth stack and show Reset Password
  useEffect(() => {
    if (loading || !passwordRecoveryActive || !user) return;
    const t = setTimeout(() => {
      const nav = navigationRef?.current;
      if (nav?.isReady?.()) {
        nav.navigate('ResetPassword');
      } else {
        nav?.navigate('ResetPassword');
      }
    }, 150);
    return () => clearTimeout(t);
  }, [passwordRecoveryActive, user, loading, navigationRef]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const showMainApp = user && !passwordRecoveryActive;

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {showMainApp ? (
        <MainNavigator />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="InviteConfirmation" component={InviteConfirmationScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AuthNavigator;

