import React, { useCallback } from 'react';
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
import Animated, { FadeIn, FadeInUp, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../src/theme';
import { useInsights } from '../src/hooks/useInsights';
import { haptics } from '../src/services/haptics';
import { MIN_SESSIONS_FOR_INSIGHTS } from '../src/services/insights';
import { Insight, InsightPeriod, InsightType, EmotionalSummary } from '../src/types';
import { format } from 'date-fns';

const INSIGHT_ICONS: Record<InsightType, keyof typeof Ionicons.glyphMap> = {
  trend: 'trending-up',
  pattern: 'repeat-outline',
  growth: 'leaf-outline',
  suggestion: 'bulb-outline',
  reflection: 'chatbubble-ellipses-outline',
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  trend: colors.primary,
  pattern: colors.primary,
  growth: colors.success,
  suggestion: colors.warning,
  reflection: colors.textSecondary,
};

export default function InsightsScreen() {
  const router = useRouter();
  const {
    report,
    state,
    error,
    selectedPeriod,
    sessionCount,
    changePeriod,
    refreshInsights,
  } = useInsights();

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handlePeriodChange = useCallback(
    (period: InsightPeriod) => {
      haptics.light();
      changePeriod(period);
    },
    [changePeriod]
  );

  const handleRefresh = useCallback(() => {
    haptics.light();
    refreshInsights();
  }, [refreshInsights]);

  const isLoading = state === 'loading' || state === 'generating';

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

          <Text style={styles.title}>Insights</Text>

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

        {/* Period Selector */}
        <Animated.View
          entering={SlideInDown.delay(100).springify()}
          style={styles.periodContainer}
        >
          <PeriodSelector selected={selectedPeriod} onSelect={handlePeriodChange} />
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state === 'generating'}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {state === 'loading' && <LoadingState />}
        {state === 'generating' && <GeneratingState />}
        {state === 'insufficient_data' && <InsufficientDataState sessionCount={sessionCount} />}
        {state === 'error' && <ErrorState message={error} onRetry={handleRefresh} />}
        {state === 'ready' && report && (
          <InsightsContent report={report} />
        )}
      </ScrollView>
    </View>
  );
}

// Period Selector Component
interface PeriodSelectorProps {
  selected: InsightPeriod;
  onSelect: (period: InsightPeriod) => void;
}

function PeriodSelector({ selected, onSelect }: PeriodSelectorProps) {
  const periods: { value: InsightPeriod; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'all_time', label: 'All Time' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <Pressable
          key={period.value}
          onPress={() => onSelect(period.value)}
          style={[
            styles.periodButton,
            selected === period.value && styles.periodButtonSelected,
          ]}
        >
          <Text
            style={[
              styles.periodButtonText,
              selected === period.value && styles.periodButtonTextSelected,
            ]}
          >
            {period.label}
          </Text>
        </Pressable>
      ))}
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
    'Looking through your conversations...',
    'Finding patterns...',
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
function InsufficientDataState({ sessionCount }: { sessionCount: number }) {
  const remaining = Math.max(MIN_SESSIONS_FOR_INSIGHTS - sessionCount, 0);
  const subtitle =
    sessionCount === 0
      ? `Start journaling to discover patterns in your thoughts. ${remaining} more ${remaining === 1 ? 'session' : 'sessions'} to unlock insights.`
      : `You have ${sessionCount} session${sessionCount === 1 ? '' : 's'}. ${remaining} more ${remaining === 1 ? 'session' : 'sessions'} to unlock insights.`;

  return (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <Ionicons name="sparkles-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Keep talking, insights are on the way</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

// Error State
function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptySubtitle}>{message || 'Unable to load insights'}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </Animated.View>
  );
}

// Insights Content
interface InsightsContentProps {
  report: NonNullable<ReturnType<typeof useInsights>['report']>;
}

function InsightsContent({ report }: InsightsContentProps) {
  return (
    <>
      {/* Emotional Summary */}
      <Animated.View entering={FadeInUp.delay(0).springify()}>
        <EmotionalSummaryCard summary={report.emotionalSummary} />
      </Animated.View>

      {/* Session Count */}
      <Animated.View entering={FadeInUp.delay(50).springify()}>
        <Text style={styles.sectionMeta}>
          Based on {report.sessionCount} session{report.sessionCount === 1 ? '' : 's'} · Updated{' '}
          {format(report.generatedAt, 'MMM d')}
        </Text>
      </Animated.View>

      {/* Insights */}
      {report.insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>What we noticed</Text>
          {report.insights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInUp.delay(100 + index * 50).springify()}
            >
              <InsightCard insight={insight} />
            </Animated.View>
          ))}
        </>
      )}

      {/* Topics */}
      {(report.topicSummary.recurringTopics.length > 0 ||
        report.topicSummary.emergingTopics.length > 0) && (
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <TopicsSummary summary={report.topicSummary} />
        </Animated.View>
      )}

      <View style={styles.bottomPadding} />
    </>
  );
}

// Emotional Summary Card
function EmotionalSummaryCard({ summary }: { summary: EmotionalSummary }) {
  const trendIcon =
    summary.trend === 'improving'
      ? 'trending-up'
      : summary.trend === 'declining'
      ? 'trending-down'
      : 'remove-outline';

  const trendColor =
    summary.trend === 'improving'
      ? colors.success
      : summary.trend === 'declining'
      ? colors.error
      : colors.textSecondary;

  return (
    <View style={styles.emotionalCard}>
      <Text style={styles.emotionalTitle}>How you've been feeling</Text>

      {/* Emotion bars */}
      <View style={styles.emotionBars}>
        {summary.dominantEmotions.slice(0, 3).map((emotion, index) => {
          const count = summary.emotionCounts[emotion.toLowerCase()] || 0;
          const maxCount = Math.max(...Object.values(summary.emotionCounts), 1);
          const width = Math.max(20, (count / maxCount) * 100);

          return (
            <View key={emotion} style={styles.emotionRow}>
              <Text style={styles.emotionLabel}>{emotion}</Text>
              <View style={styles.emotionBarContainer}>
                <View style={[styles.emotionBar, { width: `${width}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Trend */}
      <View style={styles.trendContainer}>
        <Ionicons name={trendIcon} size={16} color={trendColor} />
        <Text style={styles.trendText}>{summary.trendNarrative}</Text>
      </View>
    </View>
  );
}

// Insight Card
function InsightCard({ insight }: { insight: Insight }) {
  const iconName = INSIGHT_ICONS[insight.type] || 'bulb-outline';
  const iconColor = INSIGHT_COLORS[insight.type] || colors.primary;

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <Ionicons name={iconName} size={20} color={iconColor} />
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightNarrative}>{insight.narrative}</Text>
      <Text style={styles.insightMeta}>
        Based on {insight.supportingData.sessionsReferenced.length} session
        {insight.supportingData.sessionsReferenced.length === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

// Topics Summary
function TopicsSummary({
  summary,
}: {
  summary: { recurringTopics: string[]; emergingTopics: string[]; resolvedTopics: string[] };
}) {
  return (
    <View style={styles.topicsCard}>
      <Text style={styles.topicsTitle}>Topics</Text>

      {summary.recurringTopics.length > 0 && (
        <View style={styles.topicSection}>
          <Text style={styles.topicSectionTitle}>Keeps coming up</Text>
          <View style={styles.topicTags}>
            {summary.recurringTopics.map((topic) => (
              <View key={topic} style={styles.topicTag}>
                <Text style={styles.topicTagText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {summary.emergingTopics.length > 0 && (
        <View style={styles.topicSection}>
          <Text style={styles.topicSectionTitle}>New lately</Text>
          <View style={styles.topicTags}>
            {summary.emergingTopics.map((topic) => (
              <View key={topic} style={[styles.topicTag, styles.topicTagEmerging]}>
                <Text style={styles.topicTagText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {summary.resolvedTopics.length > 0 && (
        <View style={styles.topicSection}>
          <Text style={styles.topicSectionTitle}>Seems resolved</Text>
          <View style={styles.topicTags}>
            {summary.resolvedTopics.map((topic) => (
              <View key={topic} style={[styles.topicTag, styles.topicTagResolved]}>
                <Text style={[styles.topicTagText, styles.topicTagTextResolved]}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
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
  periodContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.xxs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    ...typography.bodySemibold,
    color: colors.textSecondary,
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    flexGrow: 1,
  },

  // Loading/Empty States
  stateContainer: {
    paddingTop: spacing.xl,
  },
  skeletonCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    height: 120,
    marginBottom: spacing.md,
  },
  skeletonCardShort: {
    height: 80,
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
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },

  // Section
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Emotional Summary Card
  emotionalCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  emotionalTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emotionBars: {
    gap: spacing.sm,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionLabel: {
    ...typography.caption,
    color: colors.text,
    width: 80,
  },
  emotionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  emotionBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trendText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },

  // Insight Card
  insightCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  insightTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  insightNarrative: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  insightMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Topics Card
  topicsCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  topicsTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  topicSection: {
    marginTop: spacing.sm,
  },
  topicSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  topicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  topicTag: {
    backgroundColor: colors.tagBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  topicTagEmerging: {
    backgroundColor: colors.primaryLight,
  },
  topicTagResolved: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicTagText: {
    ...typography.small,
    color: colors.text,
  },
  topicTagTextResolved: {
    color: colors.textSecondary,
  },

  bottomPadding: {
    height: spacing.xxxl,
  },
});
