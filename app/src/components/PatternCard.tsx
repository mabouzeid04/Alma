import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { Pattern, PatternType } from '../types';
import { haptics } from '../services/haptics';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PatternCardProps {
  pattern: Pattern;
  onDelete: () => void;
}

function getPatternIcon(type: PatternType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'emotional_trend':
      return 'heart-outline';
    case 'opinion_evolution':
      return 'swap-horizontal-outline';
    case 'relationship':
      return 'people-outline';
    case 'unresolved_question':
      return 'help-circle-outline';
    default:
      return 'analytics-outline';
  }
}

function getPatternTypeLabel(type: PatternType): string {
  switch (type) {
    case 'emotional_trend':
      return 'Emotional trend';
    case 'opinion_evolution':
      return 'Opinion shift';
    case 'relationship':
      return 'Relationship';
    case 'unresolved_question':
      return 'Unresolved question';
    default:
      return 'Pattern';
  }
}

export function PatternCard({ pattern, onDelete }: PatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
    haptics.light();
  }, []);

  const handleDelete = () => {
    haptics.light();
    Alert.alert(
      'Delete Pattern',
      'This pattern will be removed and won\'t influence future conversations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            onDelete();
          },
        },
      ]
    );
  };

  const icon = getPatternIcon(pattern.patternType);
  const typeLabel = getPatternTypeLabel(pattern.patternType);
  const title = pattern.subject || typeLabel;
  const dateStr = format(pattern.firstObserved, 'MMM d');

  return (
    <Pressable
      onPress={handleToggleExpand}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={18} color={colors.primary} style={styles.icon} />
          <Text style={styles.title} numberOfLines={isExpanded ? undefined : 1}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={handleDelete}
            hitSlop={12}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
            style={styles.expandIcon}
          />
        </View>
      </View>

      <Text style={styles.description} numberOfLines={isExpanded ? undefined : 3}>
        {pattern.description}
      </Text>

      <Text style={styles.meta}>
        {pattern.relatedSessions.length} session{pattern.relatedSessions.length !== 1 ? 's' : ''} · {dateStr}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
    marginTop: 2,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.text,
    flex: 1,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteButtonPressed: {
    opacity: 0.5,
  },
  expandIcon: {
    marginLeft: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
