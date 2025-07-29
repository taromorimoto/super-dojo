import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ClubsScreen from '../screens/ClubsScreen';
import ClubDetailsScreen from '../screens/ClubDetailsScreen';
import EventsScreen from '../screens/EventsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AuthScreen from '../screens/AuthScreen';

// Import context/hooks
import { useAuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for each tab
function ClubsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ClubsList" 
        component={ClubsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ClubDetails" 
        component={ClubDetailsScreen}
        options={{ title: 'Club Details' }}
      />
    </Stack.Navigator>
  );
}

function EventsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="EventsList" 
        component={EventsScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MarketplaceList" 
        component={MarketplaceScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Main tab navigator
function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Clubs') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: t('navigation.home') }}
      />
      <Tab.Screen 
        name="Clubs" 
        component={ClubsStack}
        options={{ title: t('navigation.clubs') }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsStack}
        options={{ title: t('navigation.events') }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{ title: t('navigation.attendance') }}
      />
      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceStack}
        options={{ title: t('navigation.marketplace') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: t('navigation.profile') }}
      />
    </Tab.Navigator>
  );
}

// Main app navigator
export default function AppNavigator() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    // TODO: Add loading screen component
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}