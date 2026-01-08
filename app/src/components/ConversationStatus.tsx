import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { ConversationState } from '../types';

interface ConversationStatusProps {
  state: ConversationState;
}

export function ConversationStatus({ state }: ConversationStatusProps) {

  const getStatusConfig = () => {
    switch (state) {
      case 'listening':
        return {
          label: 'Listening...',
          color: colors.primary, // Warm orange
        };
      case 'processing':
        return {
          label: 'Thinking...',
          color: colors.textSecondary,
        };
      case 'responding':
        return {
          label: 'Speaking...',
          color: colors.primary, // Warm orange
        };
      case 'paused':
        return {
          label: 'Paused',
          color: colors.textSecondary,
        };
      default:
        return {
          label: '',
          color: colors.textTertiary,
        };
    }
  };

  const config = getStatusConfig();

  if (state === 'idle') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});

