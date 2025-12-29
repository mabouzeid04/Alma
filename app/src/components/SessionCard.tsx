import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
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
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'EEEE, MMM d');
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
        <Text style={styles.time}>{format(session.startedAt, 'h:mm a')}</Text>
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
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.headline,
    color: colors.text,
  },
  time: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  preview: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
    ...typography.caption1,
    color: colors.textTertiary,
  },
});
