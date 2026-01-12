import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

