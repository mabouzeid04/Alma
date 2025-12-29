import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { colors, spacing, typography } from '../src/theme';
import { PulsingOrb } from '../src/components';
import { haptics } from '../src/services/haptics';
import { useSessions } from '../src/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

export default function HomeScreen() {
  const router = useRouter();
  const { sessions } = useSessions();
  const [userName] = useState(''); // Can be personalized later
  const translateY = useSharedValue(0);

  // Calculate session count and streak
  const sessionCount = sessions.length;
  const streak = calculateStreak(sessions);

  const handleStartSession = useCallback(() => {
    haptics.medium();
    router.push('/conversation');
  }, [router]);

  const navigateToHistory = useCallback(() => {
    haptics.light();
    router.push('/history');
  }, [router]);

  // Swipe up gesture for history
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY * 0.3;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -SWIPE_THRESHOLD) {
        runOnJS(navigateToHistory)();
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    const name = userName ? `, ${userName}` : '';

    if (hour >= 5 && hour < 12) return `Good morning${name}`;
    if (hour >= 12 && hour < 18) return `Good afternoon${name}`;
    if (hour >= 18 && hour < 23) return `Good evening${name}`;
    return `Still up${name}?`;
  };

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.content, animatedStyle]}>
            {/* Greeting - Top third */}
            <Animated.View
              entering={FadeIn.delay(100).duration(500)}
              style={styles.greetingContainer}
            >
              <Text style={styles.greeting}>{getGreetingMessage()}</Text>
            </Animated.View>

            {/* Pulsing Orb - Center */}
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              style={styles.orbContainer}
            >
              <PulsingOrb
                onPress={handleStartSession}
                size={120}
              />
              <Text style={styles.hintText}>Tap to start talking</Text>
            </Animated.View>

            {/* Metadata - Bottom third */}
            <Animated.View
              entering={FadeIn.delay(400).duration(500)}
              style={styles.metadataContainer}
            >
              {sessionCount > 0 && (
                <Text style={styles.metadataText}>
                  Session {sessionCount + 1}
                  {streak > 1 ? ` · ${streak} day streak` : ''}
                </Text>
              )}

              <Text style={styles.swipeHint}>
                ↑ Swipe up for history
              </Text>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
}

// Calculate streak based on consecutive days with sessions
function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique dates with sessions
  const sessionDates = new Set(
    sessions.map(s => {
      const d = new Date(s.startedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  let currentDate = new Date(today);

  while (sessionDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  greetingContainer: {
    paddingTop: spacing.xxxxl, // 60px from safe area
    alignItems: 'center',
  },
  greeting: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.5,
    marginTop: spacing.md, // 16px below orb
  },
  metadataContainer: {
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  metadataText: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.6,
    marginBottom: spacing.xxxl, // 40px from bottom safe area
  },
  swipeHint: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.4, // Very muted
    marginBottom: spacing.md,
  },
});
