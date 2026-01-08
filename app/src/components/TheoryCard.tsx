import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { Theory, TheoryCategory, TheoryStatus } from '../types';
import { haptics } from '../services/haptics';

interface TheoryCardProps {
  theory: Theory;
  onDelete: () => void;
}

function getCategoryIcon(category: TheoryCategory): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'values':
      return 'diamond-outline';
    case 'behaviors':
      return 'walk-outline';
    case 'relationships':
      return 'people-outline';
    case 'beliefs':
      return 'bulb-outline';
    case 'triggers':
      return 'flash-outline';
    default:
      return 'analytics-outline';
  }
}

function getCategoryLabel(category: TheoryCategory): string {
  switch (category) {
    case 'values':
      return 'Values';
    case 'behaviors':
      return 'Behaviors';
    case 'relationships':
      return 'Relationships';
    case 'beliefs':
      return 'Beliefs';
    case 'triggers':
      return 'Triggers';
    default:
      return 'Theory';
  }
}

function getStatusColor(status: TheoryStatus): string {
  switch (status) {
    case 'confident':
      return colors.primary;
    case 'developing':
      return colors.warning || '#F5A623';
    case 'questioning':
      return colors.error || '#FF6B6B';
    default:
      return colors.textSecondary;
  }
}

function getStatusLabel(status: TheoryStatus): string {
  switch (status) {
    case 'confident':
      return 'Confident';
    case 'developing':
      return 'Developing';
    case 'questioning':
      return 'Questioning';
    default:
      return status;
  }
}

export function TheoryCard({ theory, onDelete }: TheoryCardProps) {
  const handleDelete = () => {
    haptics.light();
    Alert.alert(
      'Delete Theory',
      'This theory will be removed and won\'t influence future conversations.',
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

  const icon = getCategoryIcon(theory.category);
  const categoryLabel = getCategoryLabel(theory.category);
  const statusColor = getStatusColor(theory.status);
  const statusLabel = getStatusLabel(theory.status);
  const dateStr = format(theory.firstFormed, 'MMM d');
  const confidencePercent = Math.round(theory.confidence * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={18} color={colors.primary} style={styles.icon} />
          <Text style={styles.title} numberOfLines={2}>
            {theory.title}
          </Text>
        </View>
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
      </View>

      <Text style={styles.description} numberOfLines={4}>
        {theory.theory}
      </Text>

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.confidence}>{confidencePercent}% confident</Text>
      </View>

      <Text style={styles.meta}>
        {categoryLabel} · {theory.evidenceSessions.length} session{theory.evidenceSessions.length !== 1 ? 's' : ''} · Since {dateStr}
      </Text>

      {theory.questioningReason && (
        <View style={styles.questioningContainer}>
          <Ionicons name="help-circle" size={14} color={colors.error || '#FF6B6B'} />
          <Text style={styles.questioningText} numberOfLines={2}>
            {theory.questioningReason}
          </Text>
        </View>
      )}
    </View>
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
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  confidence: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  questioningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: (colors.error || '#FF6B6B') + '10',
    borderRadius: borderRadius.sm,
  },
  questioningText: {
    ...typography.small,
    color: colors.error || '#FF6B6B',
    marginLeft: spacing.xs,
    flex: 1,
  },
});
