import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography } from '../theme';
import { Message } from '../types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  showTimestamp?: boolean;
  isLive?: boolean;  // For real-time transcription display
}

export function MessageBubble({
  message,
  showTimestamp = false,
  isLive = false,
}: MessageBubbleProps) {
  const isUser = message.isUser;

  return (
    <Animated.View
      entering={isLive ? FadeIn.duration(150) : FadeInUp.duration(300).springify()}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
      </View>

      {showTimestamp && (
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
          {format(message.timestamp, 'h:mm a')}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    maxWidth: '75%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,  // 12px margin for AI bubbles
  },
  bubble: {
    paddingHorizontal: spacing.md,  // 16px padding
    paddingVertical: spacing.sm,    // 12px padding
    borderRadius: borderRadius.md,  // 16px corner radius
  },
  userBubble: {
    backgroundColor: colors.userBubble,  // Soft peach #F4B59F
    borderBottomRightRadius: borderRadius.xs,  // Tail effect
  },
  aiBubble: {
    backgroundColor: colors.aiBubble,  // Tan #D4C5B0
    borderBottomLeftRadius: borderRadius.xs,  // Tail effect
  },
  text: {
    ...typography.bodyLarge,
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: colors.text,  // Deep brown
  },
  aiText: {
    color: colors.text,  // Deep brown
  },
  timestamp: {
    ...typography.caption,
    marginTop: spacing.xxs,
    opacity: 0.6,
  },
  userTimestamp: {
    color: colors.textSecondary,
    textAlign: 'right',
  },
  aiTimestamp: {
    color: colors.textSecondary,
    textAlign: 'left',
  },
});
