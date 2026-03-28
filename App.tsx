import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { RollsProvider } from './src/contexts/RollsContext';
import { NotificationCountsProvider } from './src/contexts/NotificationCountsContext';
import AuthNavigator from './src/navigation/AuthNavigator';

const navigationRef = React.createRef();

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
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

