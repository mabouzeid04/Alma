import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from '../theme';
import { JournalSession } from '../types';
import { format, isToday, isYesterday } from 'date-fns';
import { haptics } from '../services/haptics';

interface SessionCardProps {
  session: JournalSession;
  onPress: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getPreview = (): string => {
    if (session.messages.length === 0) {
      return 'No messages';
    }
    const firstUserMessage = session.messages.find((m) => m.isUser);
    if (firstUserMessage) {
      const preview = firstUserMessage.content.slice(0, 100);
      return preview.length < firstUserMessage.content.length
        ? `${preview}...`
        : preview;
    }
    return session.messages[0].content.slice(0, 100);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{getDateLabel(session.startedAt)}</Text>
      </View>

      <Text style={styles.preview} numberOfLines={2}>
        {getPreview()}
      </Text>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(session.duration)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {session.messages.length} messages
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  preview: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.6,
  },
});

