import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Prompt } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface PromptCardProps {
  prompt: Prompt;
  onTalk: () => void;
  onDismiss: () => void;
  onViewSessions?: (sessionIds: string[]) => void;
  index?: number;
}

export function PromptCard({
  prompt,
  onTalk,
  onDismiss,
  onViewSessions,
  index = 0,
}: PromptCardProps) {
  const sessionCount = prompt.relatedSessions.length;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color={colors.primary}
        />
      </View>

      <Text style={styles.question}>{prompt.question}</Text>

      {onViewSessions ? (
        <Pressable
          onPress={() => onViewSessions(prompt.relatedSessions)}
          style={({ pressed }) => [
            styles.sessionLink,
            pressed && styles.sessionLinkPressed,
          ]}
        >
          <Text style={styles.sessionLinkText}>
            Based on {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.sessionText}>
          Based on {sessionCount} session{sessionCount !== 1 ? 's' : ''}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onTalk}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Talk about this</Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
        >
          <Text style={styles.dismissButtonText}>Not now</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  question: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  sessionLink: {
    marginBottom: spacing.md,
    paddingVertical: spacing.xxs,
  },
  sessionLinkPressed: {
    opacity: 0.7,
  },
  sessionLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  sessionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissButtonPressed: {
    opacity: 0.7,
  },
  dismissButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
