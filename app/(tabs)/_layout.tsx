import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function TabsLayout() {
  const { user, profile, isLoading } = useAuthContext();
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to auth
  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  // If authenticated but no profile, redirect to profile setup
  if (!profile) {
    return <Redirect href="/(auth)/profile-setup" />;
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
            case 'events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'attendance':
              iconName = focused ? 'qr-code' : 'qr-code-outline';
              break;
            case 'marketplace':
              iconName = focused ? 'storefront' : 'storefront-outline';
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
        options={{ title: t('navigation.clubs') }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: t('navigation.events') }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ title: t('navigation.attendance') }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{ title: t('navigation.marketplace') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('navigation.profile') }}
      />
    </Tabs>
  );
}