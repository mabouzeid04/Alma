import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-knowledge" />
      <Stack.Screen name="patterns" />
      <Stack.Screen name="theories" />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}
