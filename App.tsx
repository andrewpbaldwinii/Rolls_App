import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RollsProvider } from './src/contexts/RollsContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/lib/supabase';

const App = () => {
  useEffect(() => {
    // Handle deep links when app is already running
    const handleDeepLink = async (url) => {
      console.log('Deep link received:', url);
      
      try {
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
          <AuthNavigator />
        </RollsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

