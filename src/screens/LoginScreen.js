import React, { useState, useMemo } from 'react';
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
    logoContainer: {
      alignItems: 'center',
      marginTop: -60,
      marginBottom: 40,
    },
    logo: {
      width: 600,
      height: 240,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 40,
      textAlign: 'left',
      color: colors.textPrimary,
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
  });

const LoginScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login for email:', email.trim());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Login error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Provide more helpful error messages
        let errorMessage = error.message;
        let showResendOption = false;
        
        // Check for common error cases
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid credentials')) {
          errorMessage = 'Invalid email or password. This usually means:\n\n• The password is incorrect\n• The account doesn\'t exist yet\n• The password wasn\'t saved correctly\n\nTry using "Forgot Password?" to reset your password.';
          // Don't show resend option for invalid credentials - password reset is better
          showResendOption = false;
        } else if (error.message?.includes('Email not confirmed') || error.message?.includes('not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before logging in.';
          showResendOption = true;
        } else if (error.message?.includes('Email rate limit')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        if (showResendOption) {
          Alert.alert(
            'Login Error',
            errorMessage,
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Resend Confirmation Email',
                onPress: async () => {
                  try {
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: email.trim(),
                    });
                    if (resendError) {
                      Alert.alert('Error', resendError.message);
                    } else {
                      Alert.alert('Success', 'Confirmation email sent! Please check your inbox.');
                    }
                  } catch (err) {
                    Alert.alert('Error', 'Failed to resend confirmation email');
                    console.error('Resend error:', err);
                  }
                },
              },
            ]
          );
        } else {
          // For invalid credentials, offer password reset
          if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid credentials')) {
            Alert.alert(
              'Login Error',
              errorMessage,
              [
                { text: 'OK', style: 'cancel' },
                {
                  text: 'Reset Password',
                  onPress: () =>
                    navigation.navigate('ForgotPassword', { email: email.trim() }),
                },
              ]
            );
          } else {
            Alert.alert('Login Error', errorMessage);
          }
        }
        return;
      }

      // Navigation will be handled by AuthNavigator based on auth state
      if (data.user) {
        // Success - AuthNavigator will handle navigation
        console.log('Login successful:', {
          userId: data.user.id,
          email: data.user.email,
          confirmed: data.user.email_confirmed_at ? 'Yes' : 'No',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.inputPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.inputPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.linkText}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.linkText}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

