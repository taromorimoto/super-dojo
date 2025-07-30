import React from 'react';
import { Stack } from 'expo-router';

export default function ClubsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Club Details' }}
      />
    </Stack>
  );
}