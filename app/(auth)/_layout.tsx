import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthContext } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function AuthLayout() {
  const { user, profile, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Only navigate when we have stable auth state (not loading)
    if (isLoading) return;

    // If user is authenticated and has profile, redirect to main app
    if (user && profile) {
      router.replace('/(tabs)');
      return;
    }

    // If user is authenticated but no profile, redirect to profile setup
    if (user && !profile) {
      router.replace('/(auth)/profile-setup');
      return;
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}