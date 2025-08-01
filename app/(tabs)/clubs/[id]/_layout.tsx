import React from 'react';
import { Stack } from 'expo-router';

export default function ClubLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Club Details'}}
      />
      <Stack.Screen
        name="settings"
        options={{ title: 'Club Settings' }}
      />
    </Stack>
  );
}