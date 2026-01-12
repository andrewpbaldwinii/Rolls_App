import React, { useState } from 'react';
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
} from 'react-native';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

const LoginScreen = ({ navigation }) => {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        return;
      }

      // Navigation will be handled by AuthNavigator based on auth state
      if (data.user) {
        // Success - AuthNavigator will handle navigation
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
});

export default LoginScreen;

