import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthContext } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function AuthLayout() {
  const { user, profile, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If user is authenticated and has profile, redirect to main app
  if (user && profile) {
    return <Redirect href="/(tabs)" />;
  }

  // If user is authenticated but no profile, redirect to profile setup
  if (user && !profile) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}