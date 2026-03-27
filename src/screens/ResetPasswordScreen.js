import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'left',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 40,
      textAlign: 'left',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.textPrimary,
    },
    button: {
      backgroundColor: colors.buttonPrimary,
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonDisabled: {
      backgroundColor: colors.buttonPrimaryDisabled,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: '600',
    },
    linkButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    linkText: {
      color: colors.link,
      fontSize: 14,
    },
    infoBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      padding: 15,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    infoText: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
  });

const ResetPasswordScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const { passwordRecoveryActive, signOut } = useAuth();

  const refreshSessionState = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setHasRecoverySession(!!session);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSessionState();
    }, [refreshSessionState])
  );

  useEffect(() => {
    refreshSessionState();
  }, [passwordRecoveryActive, refreshSessionState]);

  const canSetPassword = passwordRecoveryActive || hasRecoverySession;

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert(
          'Open reset link',
          'Open the link in your reset email — it will return you to this screen in the app. Then choose a new password.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
        return;
      }

      await signOut();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );

      Alert.alert('Password updated', 'Sign in with your new password.', [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {canSetPassword
            ? 'Enter your new password below.'
            : 'Request a reset from the login screen, then tap the link in your email. The link opens Rolls and brings you back here to set a new password.'}
        </Text>

        {!canSetPassword && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Tip: add rollsapp://reset-password to Supabase Auth → URL Configuration → Redirect URLs so the email link returns to the app.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor={colors.inputPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor={colors.inputPlaceholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
