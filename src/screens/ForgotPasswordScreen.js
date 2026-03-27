import React, { useState, useCallback, useMemo } from 'react';
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
  Image,
  StatusBar,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
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
    backRow: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 56 : 24,
      left: 20,
      zIndex: 1,
    },
    backText: {
      color: colors.link,
      fontSize: 16,
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    logo: {
      width: 320,
      height: 128,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'left',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 28,
      lineHeight: 22,
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
  });

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute();
  const initialEmail = route.params?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const e = route.params?.email;
      if (typeof e === 'string' && e.length > 0) {
        setEmail(e);
      }
    }, [route.params?.email])
  );

  const handleSendReset = async () => {
    if (!email?.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'rollsapp://reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
        console.error('Password reset error:', error);
        return;
      }

      Alert.alert(
        'Password Reset Email Sent',
        'Open the link in the email on this device — it should open Rolls and take you to the reset screen. If it opens in a browser, return to the app after tapping the link.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to send password reset email');
      console.error('Password reset error:', err);
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
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Back to login</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Enter the email for your account. We’ll send you a link to choose a new password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.inputPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Send reset link</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
