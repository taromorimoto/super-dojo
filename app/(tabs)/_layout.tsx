import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function TabsLayout() {
  const { user, profile, isLoading } = useAuthContext();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    // Only navigate when we have stable auth state (not loading)
    if (isLoading) return;

    // If not authenticated, redirect to auth
    if (!user) {
      router.replace('/(auth)');
      return;
    }

    // If authenticated but no profile, redirect to profile setup
    if (user && !profile) {
      router.replace('/(auth)/profile-setup');
      return;
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Only render tabs if user is authenticated and has profile
  if (!user || !profile) {
    return <LoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'index':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'clubs':
              iconName = focused ? 'people' : 'people-outline';
              break;

            case 'profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('navigation.home') }}
      />
      <Tabs.Screen
        name="clubs"
        options={{ title: t('navigation.clubs'), headerShown: false }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: t('navigation.profile') }}
      />
    </Tabs>
  );
}