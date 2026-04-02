// Crypto polyfill must be imported first for uuid to work
import '../src/polyfills/crypto';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Alert } from 'react-native';
import { colors } from '../src/theme';
import { useTypography } from '../src/hooks';
import { getDatabase } from '../src/services/database';

export default function RootLayout() {
  // Load fonts asynchronously
  useTypography();

  useEffect(() => {
    // Initialize database on app start
    getDatabase();

    // Check for required API key
    if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      Alert.alert(
        'API Key Missing',
        'Alma requires a Gemini API key to work. Please add EXPO_PUBLIC_GEMINI_API_KEY to your environment.',
        [{ text: 'OK' }]
      );
    }

    if (__DEV__) {
      // Handle E2E deep links for seeding/mocking (dev only)
      const setupE2E = async () => {
        const Linking = await import('expo-linking');
        const { handleE2ELink } = await import('../src/services/e2e-bridge');
        const initialUrl = await Linking.getInitialURL();
        await handleE2ELink(initialUrl);

        const sub = Linking.addEventListener('url', ({ url }) => {
          handleE2ELink(url);
        });
        return sub;
      };

      let sub: { remove: () => void } | undefined;
      setupE2E().then(s => { sub = s; });
      return () => sub?.remove();
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="conversation"
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="processing"
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="summary"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="session/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="insights"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
