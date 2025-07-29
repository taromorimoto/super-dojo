import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

// Initialize Convex client
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function App() {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
