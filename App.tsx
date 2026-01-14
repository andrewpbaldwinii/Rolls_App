import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RollsProvider } from './src/contexts/RollsContext';
import AuthNavigator from './src/navigation/AuthNavigator';

const App = () => {
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

