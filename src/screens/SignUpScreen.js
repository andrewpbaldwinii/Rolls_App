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

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !username.trim()) {
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

    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    // Check username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process...');
      
      // Create auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Auth signup error:', error);
        console.error('Error code:', error.code || 'N/A');
        console.error('Error message:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        Alert.alert(
          'Sign Up Error', 
          `${error.message}${error.code ? `\n\nError Code: ${error.code}` : ''}`
        );
        return;
      }

      console.log('Auth account created:', data.user?.id);

      if (data.user) {
        // Wait a moment for the database trigger to create the profile
        // Then update it with the username the user chose
        console.log('Waiting for trigger to create profile...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if profile exists first
        const { data: existingProfile, error: checkError } = await supabase
          .from('users')
          .select('id, username, display_name')
          .eq('id', data.user.id)
          .single();
        
        console.log('Profile check result:', { existingProfile, checkError });
        
        const trimmedUsername = username.trim();
        
        // Try to update the profile with the username (trigger creates it with email-based default)
        // Make sure username and display_name are coordinated
        const { error: profileError } = await supabase
          .from('users')
          .update({
            username: trimmedUsername,
            display_name: trimmedUsername, // Username and display_name should match
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          console.error('Profile error code:', profileError.code);
          console.error('Profile error message:', profileError.message);
          console.error('Profile error details:', JSON.stringify(profileError, null, 2));
          
          // Check if profile exists - if not, create it
          if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
            console.log('Profile does not exist, creating it...');
          } else {
            console.log('Profile update failed, trying to create profile as fallback...');
          }
          
          // Wait a bit more and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if username is already taken
          const { data: usernameCheck } = await supabase
            .from('users')
            .select('id')
            .eq('username', trimmedUsername)
            .neq('id', data.user.id)
            .single();
          
          if (usernameCheck) {
            Alert.alert(
              'Username Taken',
              'This username is already taken. Please choose a different one.',
              [{ text: 'OK' }]
            );
            setLoading(false);
            return;
          }
          
          const profileData = {
            id: data.user.id,
            username: trimmedUsername,
            display_name: trimmedUsername, // Always keep them in sync
            email: data.user.email, // Always include email - required for foreign key constraints
          };
          
          console.log('Attempting to insert profile:', profileData);
          const { error: createError, data: createData } = await supabase
            .from('users')
            .insert([profileData])
            .select();
          
          console.log('Insert result:', { createError, createData });
            
          if (createError) {
            console.error('Error creating profile (fallback):', createError);
            console.error('Create error code:', createError.code);
            console.error('Create error message:', createError.message);
            console.error('Create error details:', JSON.stringify(createError, null, 2));
            
            // Provide more helpful error messages
            let errorMessage = createError.message || createError.code || 'Unknown error';
            if (createError.code === '23505') {
              errorMessage = 'Username is already taken. Please choose a different username.';
            } else if (createError.code === '23502') {
              errorMessage = 'Missing required field. Please contact support.';
            } else if (createError.message?.includes('permission') || createError.message?.includes('policy')) {
              errorMessage = 'Permission denied. Please run COMPLETE_PROFILE_SETUP.sql in Supabase.';
            }
            
            Alert.alert(
              'Account Created',
              `Your account was created, but there was an issue setting up your profile:\n\n${errorMessage}\n\nPlease check the console for details or contact support.`,
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
            return;
          } else {
            console.log('Profile created successfully via fallback!');
          }
        } else {
          console.log('Profile updated successfully!');
        }

        Alert.alert(
          'Success',
          'Account created! Please check your email for verification.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Sign up error:', error);
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
        <Text style={styles.title}>Sign Up</Text>

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
          placeholder="Username"
          placeholderTextColor={colors.inputPlaceholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.inputPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={colors.inputPlaceholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Already have an account? Login
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

export default SignUpScreen;

