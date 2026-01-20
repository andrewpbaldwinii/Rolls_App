import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { RollsProvider } from './src/contexts/RollsContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/lib/supabase';

const navigationRef = React.createRef();

const App = () => {
  useEffect(() => {
    // Handle deep links when app is already running
    const handleDeepLink = async (url) => {
      console.log('Deep link received:', url);
      
      try {
        // Check if it's a roll invite link
        if (url.includes('rollsapp://roll/invite/')) {
          const token = url.split('rollsapp://roll/invite/')[1];
          if (token) {
            console.log('Roll invite token detected:', token);
            // Wait a bit for navigation to be ready
            setTimeout(() => {
              if (navigationRef.current) {
                // Check if user is logged in
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    // User is logged in, navigate to invite confirmation
                    navigationRef.current?.navigate('MainTabs', {
                      screen: 'Rolls',
                      params: {
                        screen: 'InviteConfirmation',
                        params: { inviteToken: token },
                      },
                    });
                    // Also try direct navigation
                    navigationRef.current?.navigate('InviteConfirmation', { inviteToken: token });
                  } else {
                    // User not logged in, store token and show login
                    // After login, check for pending invite
                    console.log('User not logged in, invite will be handled after login');
                  }
                });
              }
            }, 1000);
          }
          return;
        }

        // Check if it's a password reset link from Supabase
        if (url.includes('type=recovery') || url.includes('token=') || url.includes('access_token=')) {
          // Parse the URL to extract the token
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('access_token');
          const type = urlObj.searchParams.get('type');
          
          if (type === 'recovery' && token) {
            console.log('Password recovery token detected');
            // Supabase will handle this via auth state change
            // The ResetPasswordScreen will detect the PASSWORD_RECOVERY event
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Handle initial URL (when app is opened from a link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RollsProvider>
          <AuthNavigator navigationRef={navigationRef} />
        </RollsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

