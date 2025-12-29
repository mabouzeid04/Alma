import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../src/theme';
import { RecordButton } from '../src/components';
import { haptics } from '../src/services/haptics';
import { useSessions } from '../src/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const { sessions } = useSessions();
  const recentSession = sessions[0];

  const handleStartSession = useCallback(() => {
    haptics.medium();
    router.push('/conversation');
  }, [router]);

  const handleViewHistory = useCallback(() => {
    haptics.light();
    router.push('/history');
  }, [router]);

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  return (
    <LinearGradient
      colors={[colors.background, '#0A0A0F']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <Text style={styles.greeting}>{getGreetingMessage()}</Text>
          <Text style={styles.subtitle}>What's on your mind?</Text>
        </Animated.View>

        {/* Center - Main Record Button */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={styles.centerContainer}
        >
          <View style={styles.recordContainer}>
            <RecordButton
              isRecording={false}
              onPress={handleStartSession}
              size={100}
            />
            <Text style={styles.recordHint}>Tap to start talking</Text>
          </View>
        </Animated.View>

        {/* Bottom - Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(300)}
          style={styles.bottomContainer}
        >
          {/* Recent Session Preview */}
          {recentSession && (
            <Pressable
              onPress={() => router.push(`/session/${recentSession.id}`)}
              style={({ pressed }) => [
                styles.recentCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.recentHeader}>
                <Text style={styles.recentLabel}>Last session</Text>
                <Text style={styles.recentTime}>
                  {formatRelativeTime(recentSession.startedAt)}
                </Text>
              </View>
              <Text style={styles.recentPreview} numberOfLines={2}>
                {recentSession.messages.find((m) => m.isUser)?.content ||
                  'No messages'}
              </Text>
            </Pressable>
          )}

          {/* History Button */}
          <Pressable
            onPress={handleViewHistory}
            style={({ pressed }) => [
              styles.historyButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.historyButtonText}>View all sessions</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.largeTitle,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.title3,
    color: colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContainer: {
    alignItems: 'center',
  },
  recordHint: {
    ...typography.subheadline,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
  bottomContainer: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  recentCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recentLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentTime: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  recentPreview: {
    ...typography.body,
    color: colors.text,
  },
  historyButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyButtonText: {
    ...typography.headline,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
