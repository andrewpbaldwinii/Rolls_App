import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

const ResetPasswordScreen = ({ navigation, route }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const hasShownAlert = useRef(false);

  useEffect(() => {
    // Check if we have a session with a password reset token
    // This happens when user clicks the reset link in their email
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      if (event === 'PASSWORD_RECOVERY') {
        // User has clicked the password reset link
        console.log('Password recovery event detected - user can now reset password');
        Alert.alert(
          'Password Reset Ready',
          'You can now set a new password below.',
          [{ text: 'OK' }]
        );
      }
    });

    // Also check on mount if we already have a recovery session
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Recovery session exists on mount:', session.user.id);
        setHasRecoverySession(true);
      } else {
        console.log('No recovery session found');
        setHasRecoverySession(false);
      }
    };
    checkRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      console.log('Attempting to reset password...');
      
      // Check if we have a session (required for updateUser)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert(
          'Session Required',
          'Please click the password reset link in your email first, then return to this screen to set your new password.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Password reset error:', error);
        Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
        return;
      }

      console.log('Password reset successful');
      Alert.alert(
        'Success',
        'Your password has been reset. You can now login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
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
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {hasRecoverySession 
            ? 'Enter your new password below' 
            : 'To reset your password:\n\n1. Request a password reset from the login screen\n2. Click the link in your email\n3. Return to this screen to set your new password'}
        </Text>
        
        {!hasRecoverySession && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 If the email link opens in a browser instead of the app, that's okay! Just return to the app and you can set your password here.
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

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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

export default ResetPasswordScreen;
