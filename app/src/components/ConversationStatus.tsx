import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { ConversationState } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';

interface ConversationStatusProps {
  state: ConversationState;
}

export function ConversationStatus({ state }: ConversationStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'listening':
        return {
          label: 'Listening...',
          color: colors.recording,
          showWaveform: true,
        };
      case 'processing':
        return {
          label: 'Processing...',
          color: colors.aiThinking,
          showWaveform: false,
        };
      case 'responding':
        return {
          label: 'Speaking...',
          color: colors.aiSpeaking,
          showWaveform: true,
        };
      case 'paused':
        return {
          label: 'Paused',
          color: colors.textSecondary,
          showWaveform: false,
        };
      default:
        return {
          label: '',
          color: colors.textTertiary,
          showWaveform: false,
        };
    }
  };

  const config = getStatusConfig();

  if (state === 'idle') {
    return null;
  }

  return (
    <View style={styles.container}>
      {config.showWaveform && (
        <WaveformVisualizer
          isActive={true}
          color={config.color}
          barCount={5}
          maxHeight={20}
        />
      )}
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
    gap: spacing.sm,
  },
  label: {
    ...typography.subheadline,
    fontWeight: '500',
  },
});
