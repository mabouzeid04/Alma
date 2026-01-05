import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../src/theme';
import { usePrompts } from '../src/hooks';
import { PromptCard } from '../src/components';
import { haptics } from '../src/services/haptics';
import { Prompt } from '../src/types';

export default function PromptsScreen() {
  const router = useRouter();
  const {
    prompts,
    state,
    sessionsNeeded,
    error,
    loadPrompts,
    generateMore,
    dismissPrompt,
  } = usePrompts();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleRefresh = useCallback(() => {
    haptics.light();
    loadPrompts();
  }, [loadPrompts]);

  const handleGenerateMore = useCallback(async () => {
    haptics.light();
    setIsGenerating(true);
    await generateMore(5);
    setIsGenerating(false);
  }, [generateMore]);

  const handleTalk = useCallback(
    (prompt: Prompt) => {
      haptics.medium();
      // Navigate to conversation with the prompt ID
      router.push(`/conversation?promptId=${prompt.id}`);
    },
    [router]
  );

  const handleDismiss = useCallback(
    async (promptId: string) => {
      haptics.light();
      await dismissPrompt(promptId);
    },
    [dismissPrompt]
  );

  const handleViewSessions = useCallback(
    (sessionIds: string[]) => {
      haptics.light();
      // Navigate to history filtered by session IDs
      // For now, just navigate to history
      router.push('/history');
    },
    [router]
  );

  const isLoading = state === 'loading';
  const isGeneratingState = state === 'generating' || isGenerating;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={20}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>Prompts</Text>

          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
            hitSlop={20}
            disabled={isLoading}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={isLoading ? colors.textSecondary : colors.text}
            />
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && <LoadingState />}
        {state === 'insufficient_data' && (
          <InsufficientDataState sessionsNeeded={sessionsNeeded} />
        )}
        {state === 'ready' && prompts.length === 0 && !isGeneratingState && (
          <EmptyState onGenerate={handleGenerateMore} />
        )}
        {state === 'ready' && (
          <>
            {prompts.length > 0 && (
              <Animated.View entering={FadeIn}>
                <Text style={styles.sectionTitle}>Questions worth exploring</Text>
              </Animated.View>
            )}

            {prompts.map((prompt, index) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                index={index}
                onTalk={() => handleTalk(prompt)}
                onDismiss={() => handleDismiss(prompt.id)}
                onViewSessions={handleViewSessions}
              />
            ))}

            {/* Generate More Section */}
            {prompts.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(prompts.length * 100 + 100)}
                style={styles.generateMoreContainer}
              >
                <View style={styles.divider} />
                <Text style={styles.generateMoreTitle}>Want more questions?</Text>
                <Pressable
                  onPress={handleGenerateMore}
                  disabled={isGeneratingState}
                  style={({ pressed }) => [
                    styles.generateButton,
                    pressed && styles.generateButtonPressed,
                    isGeneratingState && styles.generateButtonDisabled,
                  ]}
                >
                  {isGeneratingState ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate 5 more</Text>
                  )}
                </Pressable>
              </Animated.View>
            )}
          </>
        )}

        {/* Show generating indicator when generating */}
        {isGeneratingState && prompts.length === 0 && <GeneratingState />}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// Loading State
function LoadingState() {
  return (
    <Animated.View entering={FadeIn} style={styles.stateContainer}>
      <View style={styles.skeletonCard} />
      <View style={[styles.skeletonCard, styles.skeletonCardShort]} />
      <View style={styles.skeletonCard} />
    </Animated.View>
  );
}

// Generating State
function GeneratingState() {
  const messages = [
    'Looking through your patterns...',
    'Finding things worth exploring...',
    'Almost there...',
  ];
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View entering={FadeIn} style={styles.generatingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.generatingText}>{messages[messageIndex]}</Text>
    </Animated.View>
  );
}

// Insufficient Data State
function InsufficientDataState({ sessionsNeeded }: { sessionsNeeded: number }) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Keep talking, questions are on the way</Text>
      <Text style={styles.emptySubtitle}>
        I need a few more conversations before I can spot patterns worth exploring.
        {sessionsNeeded > 0 && ` ${sessionsNeeded} more session${sessionsNeeded === 1 ? '' : 's'} to unlock prompts.`}
      </Text>
      <Pressable
        onPress={() => {
          haptics.light();
          router.push('/conversation');
        }}
        style={styles.startButton}
      >
        <Text style={styles.startButtonText}>Start a session</Text>
      </Pressable>
    </Animated.View>
  );
}

// Empty State (has sessions but no prompts yet)
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Nothing to explore yet</Text>
      <Text style={styles.emptySubtitle}>
        Keep journaling and I'll start noticing patterns worth exploring together.
      </Text>
      <View style={styles.emptyActions}>
        <Pressable onPress={onGenerate} style={styles.generateButtonLarge}>
          <Text style={styles.generateButtonText}>Generate prompts</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.light();
            router.push('/conversation');
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Start a session</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 60,
  },
  backButton: {
    padding: spacing.xs,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Loading/Empty States
  stateContainer: {
    paddingTop: spacing.xl,
  },
  skeletonCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    height: 140,
    marginBottom: spacing.md,
  },
  skeletonCardShort: {
    height: 100,
  },
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  generatingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  emptyActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  startButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  startButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },

  // Generate More Section
  generateMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  generateMoreTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 140,
    alignItems: 'center',
  },
  generateButtonPressed: {
    opacity: 0.8,
  },
  generateButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  generateButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },
  generateButtonLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  bottomPadding: {
    height: spacing.xxxl,
  },
});
