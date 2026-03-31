import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { RollsProvider } from './contexts/RollsContext';
import { NotificationCountsProvider } from './contexts/NotificationCountsContext';
import AuthNavigator from './navigation/AuthNavigator';
import PushNotificationBootstrap from './components/PushNotificationBootstrap';

const navigationRef = React.createRef();

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PushNotificationBootstrap />
          <NotificationCountsProvider>
            <RollsProvider>
              <AuthNavigator navigationRef={navigationRef} />
            </RollsProvider>
          </NotificationCountsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
