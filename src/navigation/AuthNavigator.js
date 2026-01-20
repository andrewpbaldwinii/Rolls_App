import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import MainNavigator from './MainNavigator';
import colors from '../constants/colors';
import { supabase } from '../lib/supabase';

const Stack = createStackNavigator();

const AuthNavigator = ({ navigationRef }) => {
  const { user, loading } = useAuth();

  // Handle deep links after navigation is ready
  useEffect(() => {
    if (!navigationRef?.current || loading) return;

    const handleDeepLink = async (url) => {
      if (url && url.includes('rollsapp://roll/invite/')) {
        const token = url.split('rollsapp://roll/invite/')[1];
        if (token && user) {
          // Navigate to invite confirmation
          setTimeout(() => {
            navigationRef.current?.navigate('InviteConfirmation', { inviteToken: token });
          }, 500);
        }
      }
    };

    // Check initial URL
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for new URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [navigationRef, user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        <MainNavigator />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AuthNavigator;

