import React, { useCallback, useState, useEffect } from 'react';
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
import { colors, spacing, borderRadius, shadows, typography } from '../src/theme';
import { useInsights } from '../src/hooks/useInsights';
import { haptics } from '../src/services/haptics';
import { MIN_SESSIONS_FOR_INSIGHTS } from '../src/services/insights';
import { Insight, InsightPeriod, InsightType, EmotionalSummary, GrowthSnapshot, InsightEvidence, Theory, TheoryCategory } from '../src/types';
import { format } from 'date-fns';
import { getConfidentTheories, getEmergingTheories } from '../src/services/theories';

const INSIGHT_ICONS: Record<InsightType, keyof typeof Ionicons.glyphMap> = {
  trend: 'trending-up',
  pattern: 'repeat-outline',
  growth: 'leaf-outline',
  suggestion: 'bulb-outline',
  reflection: 'chatbubble-ellipses-outline',
  connection: 'git-network-outline',
  blind_spot: 'eye-off-outline',
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  trend: colors.primary,
  pattern: colors.primary,
  growth: colors.success,
  suggestion: colors.warning,
  reflection: colors.textSecondary,
  connection: '#9B59B6', // Purple for connections
  blind_spot: '#E67E22', // Orange for blind spots
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

  // State for theories
  const [confidentTheories, setConfidentTheories] = useState<Theory[]>([]);
  const [emergingTheories, setEmergingTheories] = useState<Theory[]>([]);

  // Load theories when state is ready
  useEffect(() => {
    const loadTheories = async () => {
      try {
        const [confident, emerging] = await Promise.all([
          getConfidentTheories(),
          getEmergingTheories(),
        ]);
        setConfidentTheories(confident);
        setEmergingTheories(emerging);
      } catch (err) {
        console.warn('Failed to load theories:', err);
      }
    };

    if (state === 'ready') {
      loadTheories();
    }
  }, [state]);

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

  // Navigate to session detail when tapping evidence
  const handleSessionPress = useCallback((sessionId: string) => {
    haptics.light();
    router.push(`/session/${sessionId}`);
  }, [router]);

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
          <InsightsContent
            report={report}
            onSessionPress={handleSessionPress}
            confidentTheories={confidentTheories}
            emergingTheories={emergingTheories}
          />
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

// Category icons and colors for theories
const THEORY_CATEGORY_ICONS: Record<TheoryCategory, keyof typeof Ionicons.glyphMap> = {
  values: 'heart-outline',
  behaviors: 'body-outline',
  relationships: 'people-outline',
  beliefs: 'bulb-outline',
  triggers: 'flash-outline',
};

const THEORY_CATEGORY_COLORS: Record<TheoryCategory, string> = {
  values: '#E74C3C',
  behaviors: '#3498DB',
  relationships: '#9B59B6',
  beliefs: '#F39C12',
  triggers: '#1ABC9C',
};

// Insights Content
interface InsightsContentProps {
  report: NonNullable<ReturnType<typeof useInsights>['report']>;
  onSessionPress: (sessionId: string) => void;
  confidentTheories: Theory[];
  emergingTheories: Theory[];
}

function InsightsContent({ report, onSessionPress, confidentTheories, emergingTheories }: InsightsContentProps) {
  // Separate insights by type for better organization
  const connectionInsights = report.insights.filter((i) => i.type === 'connection');
  const blindSpotInsights = report.insights.filter((i) => i.type === 'blind_spot');
  const growthInsights = report.insights.filter((i) => i.type === 'growth');
  const otherInsights = report.insights.filter(
    (i) => !['connection', 'blind_spot', 'growth'].includes(i.type)
  );

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

      {/* Growth Snapshot - Overall change summary */}
      {report.growthSnapshot && (
        <Animated.View entering={FadeInUp.delay(75).springify()}>
          <GrowthSnapshotCard snapshot={report.growthSnapshot} />
        </Animated.View>
      )}

      {/* Non-Obvious Connections */}
      {connectionInsights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            <Ionicons name="git-network-outline" size={16} color={colors.text} /> Hidden Connections
          </Text>
          {connectionInsights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInUp.delay(100 + index * 50).springify()}
            >
              <InsightCard insight={insight} onSessionPress={onSessionPress} />
            </Animated.View>
          ))}
        </>
      )}

      {/* Blind Spots */}
      {blindSpotInsights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            <Ionicons name="eye-off-outline" size={16} color={colors.text} /> Blind Spots
          </Text>
          {blindSpotInsights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInUp.delay(150 + index * 50).springify()}
            >
              <InsightCard insight={insight} onSessionPress={onSessionPress} />
            </Animated.View>
          ))}
        </>
      )}

      {/* Growth & Change Insights */}
      {growthInsights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            <Ionicons name="leaf-outline" size={16} color={colors.text} /> Growth & Change
          </Text>
          {growthInsights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInUp.delay(200 + index * 50).springify()}
            >
              <InsightCard insight={insight} onSessionPress={onSessionPress} />
            </Animated.View>
          ))}
        </>
      )}

      {/* Other Insights (trends, patterns, reflections) */}
      {otherInsights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>What we noticed</Text>
          {otherInsights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInUp.delay(250 + index * 50).springify()}
            >
              <InsightCard insight={insight} onSessionPress={onSessionPress} />
            </Animated.View>
          ))}
        </>
      )}

      {/* Topics */}
      {(report.topicSummary.recurringTopics.length > 0 ||
        report.topicSummary.emergingTopics.length > 0) && (
        <Animated.View entering={FadeInUp.delay(350).springify()}>
          <TopicsSummary summary={report.topicSummary} />
        </Animated.View>
      )}

      {/* Working Theories - Long-term understanding */}
      {(confidentTheories.length > 0 || emergingTheories.length > 0) && (
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <TheoriesCard
            confidentTheories={confidentTheories}
            emergingTheories={emergingTheories}
          />
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

// Insight Card with enhanced evidence display
function InsightCard({ insight, onSessionPress }: { insight: Insight; onSessionPress?: (sessionId: string) => void }) {
  const iconName = INSIGHT_ICONS[insight.type] || 'bulb-outline';
  const iconColor = INSIGHT_COLORS[insight.type] || colors.primary;

  // Direction icon for growth indicators
  const getDirectionIcon = (direction: string): keyof typeof Ionicons.glyphMap => {
    switch (direction) {
      case 'improving': return 'arrow-up-circle';
      case 'declining': return 'arrow-down-circle';
      case 'resolved': return 'checkmark-circle';
      case 'new': return 'add-circle';
      default: return 'remove-circle';
    }
  };

  const getDirectionColor = (direction: string): string => {
    switch (direction) {
      case 'improving': return colors.success;
      case 'declining': return colors.error;
      case 'resolved': return colors.success;
      case 'new': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.insightCard}>
      {/* Header with icon and title */}
      <View style={styles.insightHeader}>
        <View style={[styles.insightIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>

      {/* Main narrative */}
      <Text style={styles.insightNarrative}>{insight.narrative}</Text>

      {/* Connection details for connection-type insights */}
      {insight.connection && (
        <View style={styles.connectionContainer}>
          <View style={styles.connectionItems}>
            <Text style={styles.connectionItem}>{insight.connection.items[0]}</Text>
            <Ionicons name="link" size={14} color={colors.textSecondary} style={styles.connectionLink} />
            <Text style={styles.connectionItem}>{insight.connection.items[1]}</Text>
          </View>
          <Text style={styles.connectionType}>
            {insight.connection.correlationType === 'co_occurrence' && 'Often appear together'}
            {insight.connection.correlationType === 'trigger' && 'One triggers the other'}
            {insight.connection.correlationType === 'temporal' && 'Time-based pattern'}
            {insight.connection.correlationType === 'contrast' && 'Contrasting pattern'}
          </Text>
        </View>
      )}

      {/* Growth indicator for growth-type insights */}
      {insight.growthIndicator && (
        <View style={styles.growthContainer}>
          <View style={styles.growthHeader}>
            <Ionicons
              name={getDirectionIcon(insight.growthIndicator.direction)}
              size={16}
              color={getDirectionColor(insight.growthIndicator.direction)}
            />
            <Text style={styles.growthTopic}>{insight.growthIndicator.topic}</Text>
          </View>
          <View style={styles.growthComparison}>
            <View style={styles.growthState}>
              <Text style={styles.growthLabel}>Before</Text>
              <Text style={styles.growthValue}>{insight.growthIndicator.before}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
            <View style={styles.growthState}>
              <Text style={styles.growthLabel}>Now</Text>
              <Text style={[styles.growthValue, { color: getDirectionColor(insight.growthIndicator.direction) }]}>
                {insight.growthIndicator.after}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Evidence quotes */}
      {insight.evidence && insight.evidence.length > 0 && (
        <View style={styles.evidenceContainer}>
          <Text style={styles.evidenceTitle}>Evidence</Text>
          {insight.evidence.slice(0, 2).map((evidence, index) => (
            <Pressable
              key={`${evidence.sessionId}-${index}`}
              style={({ pressed }) => [styles.evidenceItem, pressed && styles.evidenceItemPressed]}
              onPress={() => onSessionPress?.(evidence.sessionId)}
            >
              <View style={styles.evidenceQuoteContainer}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.evidenceQuote} numberOfLines={2}>"{evidence.quote}"</Text>
              </View>
              <Text style={styles.evidenceDate}>
                {format(evidence.sessionDate, 'MMM d')} →
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Session count footer */}
      <View style={styles.insightFooter}>
        <Text style={styles.insightMeta}>
          Based on {insight.supportingData.sessionsReferenced.length} session
          {insight.supportingData.sessionsReferenced.length === 1 ? '' : 's'}
        </Text>
        {insight.type === 'blind_spot' && (
          <View style={styles.blindSpotBadge}>
            <Text style={styles.blindSpotBadgeText}>Worth exploring</Text>
          </View>
        )}
      </View>
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

// Growth Snapshot Card - Shows overall change summary
function GrowthSnapshotCard({ snapshot }: { snapshot: GrowthSnapshot }) {
  const hasContent = snapshot.resolved.length > 0 ||
    snapshot.improving.length > 0 ||
    snapshot.newConcerns.length > 0 ||
    snapshot.stagnant.length > 0;

  if (!hasContent) return null;

  return (
    <View style={styles.growthSnapshotCard}>
      <View style={styles.growthSnapshotHeader}>
        <Ionicons name="analytics-outline" size={20} color={colors.text} />
        <Text style={styles.growthSnapshotTitle}>Growth & Change</Text>
      </View>

      {/* Resolved - Positive! */}
      {snapshot.resolved.length > 0 && (
        <View style={styles.growthSnapshotSection}>
          <View style={styles.growthSnapshotSectionHeader}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.growthSnapshotSectionTitle, { color: colors.success }]}>
              Resolved
            </Text>
          </View>
          <View style={styles.growthSnapshotItems}>
            {snapshot.resolved.map((item, index) => (
              <Text key={index} style={styles.growthSnapshotItem}>• {item}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Improving */}
      {snapshot.improving.length > 0 && (
        <View style={styles.growthSnapshotSection}>
          <View style={styles.growthSnapshotSectionHeader}>
            <Ionicons name="arrow-up-circle" size={16} color={colors.success} />
            <Text style={[styles.growthSnapshotSectionTitle, { color: colors.success }]}>
              Getting better
            </Text>
          </View>
          <View style={styles.growthSnapshotItems}>
            {snapshot.improving.map((item, index) => (
              <Text key={index} style={styles.growthSnapshotItem}>• {item}</Text>
            ))}
          </View>
        </View>
      )}

      {/* New Concerns - Worth watching */}
      {snapshot.newConcerns.length > 0 && (
        <View style={styles.growthSnapshotSection}>
          <View style={styles.growthSnapshotSectionHeader}>
            <Ionicons name="add-circle" size={16} color={colors.warning} />
            <Text style={[styles.growthSnapshotSectionTitle, { color: colors.warning }]}>
              New on your mind
            </Text>
          </View>
          <View style={styles.growthSnapshotItems}>
            {snapshot.newConcerns.map((item, index) => (
              <Text key={index} style={styles.growthSnapshotItem}>• {item}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Stagnant - Blind spots */}
      {snapshot.stagnant.length > 0 && (
        <View style={styles.growthSnapshotSection}>
          <View style={styles.growthSnapshotSectionHeader}>
            <Ionicons name="pause-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.growthSnapshotSectionTitle, { color: colors.textSecondary }]}>
              Still circling
            </Text>
          </View>
          <View style={styles.growthSnapshotItems}>
            {snapshot.stagnant.map((item, index) => (
              <Text key={index} style={[styles.growthSnapshotItem, styles.growthSnapshotItemStagnant]}>
                • {item}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Theories Card - Working theories about the user (long-term understanding)
function TheoriesCard({
  confidentTheories,
  emergingTheories,
}: {
  confidentTheories: Theory[];
  emergingTheories: Theory[];
}) {
  if (confidentTheories.length === 0 && emergingTheories.length === 0) return null;

  return (
    <View style={styles.theoriesCard}>
      <View style={styles.theoriesHeader}>
        <Ionicons name="sparkles-outline" size={20} color={colors.text} />
        <Text style={styles.theoriesTitle}>Working Theories</Text>
      </View>
      <Text style={styles.theoriesSubtitle}>
        Long-term patterns I'm noticing about you
      </Text>

      {/* Confident Theories */}
      {confidentTheories.length > 0 && (
        <View style={styles.theorySection}>
          {confidentTheories.map((theory) => (
            <View key={theory.id} style={styles.theoryItem}>
              <View style={styles.theoryHeader}>
                <View
                  style={[
                    styles.theoryIconContainer,
                    { backgroundColor: `${THEORY_CATEGORY_COLORS[theory.category]}15` },
                  ]}
                >
                  <Ionicons
                    name={THEORY_CATEGORY_ICONS[theory.category]}
                    size={14}
                    color={THEORY_CATEGORY_COLORS[theory.category]}
                  />
                </View>
                <Text style={styles.theoryTitle}>{theory.title}</Text>
                <View style={styles.theoryConfidentBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                </View>
              </View>
              <Text style={styles.theoryNarrative}>{theory.theory}</Text>
              <Text style={styles.theoryMeta}>
                Based on {theory.evidenceSessions.length} sessions over{' '}
                {Math.round((Date.now() - theory.firstFormed.getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Emerging Theories */}
      {emergingTheories.length > 0 && (
        <View style={styles.theorySection}>
          <Text style={styles.theorySectionLabel}>Still developing</Text>
          {emergingTheories.map((theory) => (
            <View key={theory.id} style={[styles.theoryItem, styles.theoryItemEmerging]}>
              <View style={styles.theoryHeader}>
                <View
                  style={[
                    styles.theoryIconContainer,
                    { backgroundColor: `${THEORY_CATEGORY_COLORS[theory.category]}15` },
                  ]}
                >
                  <Ionicons
                    name={THEORY_CATEGORY_ICONS[theory.category]}
                    size={14}
                    color={THEORY_CATEGORY_COLORS[theory.category]}
                  />
                </View>
                <Text style={[styles.theoryTitle, styles.theoryTitleEmerging]}>{theory.title}</Text>
                <Text style={styles.theoryConfidence}>
                  {Math.round(theory.confidence * 100)}%
                </Text>
              </View>
              <Text style={[styles.theoryNarrative, styles.theoryNarrativeEmerging]}>
                {theory.theory}
              </Text>
            </View>
          ))}
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
    marginBottom: spacing.sm,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  insightNarrative: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  insightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  insightMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Connection display
  connectionContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  connectionItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  connectionItem: {
    ...typography.bodySemibold,
    color: colors.text,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  connectionLink: {
    marginHorizontal: spacing.xs,
  },
  connectionType: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Growth indicator display
  growthContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  growthTopic: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  growthComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  growthState: {
    flex: 1,
    alignItems: 'center',
  },
  growthLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  growthValue: {
    ...typography.small,
    color: colors.text,
    textAlign: 'center',
  },

  // Evidence display
  evidenceContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  evidenceTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginBottom: spacing.xxs,
  },
  evidenceItemPressed: {
    opacity: 0.7,
  },
  evidenceQuoteContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evidenceQuote: {
    ...typography.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: spacing.xs,
    flex: 1,
  },
  evidenceDate: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  // Blind spot badge
  blindSpotBadge: {
    backgroundColor: '#E67E2220',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  blindSpotBadgeText: {
    ...typography.caption,
    color: '#E67E22',
  },

  // Growth Snapshot Card
  growthSnapshotCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  growthSnapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  growthSnapshotTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  growthSnapshotSection: {
    marginBottom: spacing.sm,
  },
  growthSnapshotSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  growthSnapshotSectionTitle: {
    ...typography.caption,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  growthSnapshotItems: {
    paddingLeft: spacing.md,
  },
  growthSnapshotItem: {
    ...typography.small,
    color: colors.text,
    lineHeight: 20,
  },
  growthSnapshotItemStagnant: {
    color: colors.textSecondary,
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

  // Theories Card
  theoriesCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  theoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  theoriesTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  theoriesSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  theorySection: {
    marginTop: spacing.xs,
  },
  theorySectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  theoryItem: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  theoryItemEmerging: {
    opacity: 0.8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  theoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  theoryIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theoryTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  theoryTitleEmerging: {
    color: colors.textSecondary,
  },
  theoryConfidentBadge: {
    marginLeft: spacing.xs,
  },
  theoryConfidence: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  theoryNarrative: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  theoryNarrativeEmerging: {
    color: colors.textSecondary,
  },
  theoryMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  bottomPadding: {
    height: spacing.xxxl,
  },
});
