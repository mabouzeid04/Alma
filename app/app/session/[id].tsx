import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { MessageBubble } from '../../src/components';
import { useSessions } from '../../src/hooks';
import { haptics } from '../../src/services/haptics';
import { JournalSession, MemoryNode } from '../../src/types';
import * as database from '../../src/services/database';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteSession } = useSessions();
  const [session, setSession] = useState<JournalSession | null>(null);
  const [memoryNode, setMemoryNode] = useState<MemoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // Animation for transcript expand/collapse
  const transcriptHeight = useSharedValue(0);
  const arrowRotation = useSharedValue(0);

  useEffect(() => {
    async function loadSession() {
      if (!id) return;
      try {
        const loadedSession = await database.getSession(id);
        setSession(loadedSession);

        if (loadedSession) {
          const memory = await database.getMemoryNodeForSession(id);
          setMemoryNode(memory);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [id]);

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Session',
      "Delete this session? This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteSession(id);
              haptics.warning();
              router.back();
            }
          },
        },
      ]
    );
  }, [id, deleteSession, router]);

  const toggleTranscript = useCallback(() => {
    haptics.light();
    setIsTranscriptExpanded((prev) => {
      const newState = !prev;
      arrowRotation.value = withTiming(newState ? 180 : 0, { duration: 300 });
      return newState;
    });
  }, []);

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Session not found</Text>
      </View>
    );
  }

  const headerDate = format(session.startedAt, "MMM d, h:mm a");

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            hitSlop={20}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.headerDate}>{headerDate}</Text>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
            hitSlop={20}
          >
            <Ionicons name="trash-outline" size={22} color={colors.delete} />
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Section - Always Visible */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Summary</Text>
            <View style={styles.dividerLine} />
          </View>

          {memoryNode?.summary ? (
            <View style={styles.summarySection}>
              <Text style={styles.summaryText}>{memoryNode.summary}</Text>

              {/* Topics Tags */}
              {memoryNode.topics && memoryNode.topics.length > 0 && (
                <View style={styles.tagsSection}>
                  <Text style={styles.tagLabel}>Topics:</Text>
                  <View style={styles.tagsContainer}>
                    {memoryNode.topics.map((topic, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{topic}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Emotions Tags */}
              {memoryNode.emotions && memoryNode.emotions.length > 0 && (
                <View style={styles.tagsSection}>
                  <Text style={styles.tagLabel}>Emotions:</Text>
                  <View style={styles.tagsContainer}>
                    {memoryNode.emotions.map((emotion, index) => (
                      <View key={index} style={[styles.tag, styles.emotionTag]}>
                        <Text style={styles.tagText}>{emotion}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.summarySection}>
              <Text style={styles.summaryText}>
                Processing summary...
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Transcript Section - Collapsible */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Transcript</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={toggleTranscript}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>
              {isTranscriptExpanded ? 'Collapse' : 'Expand'}
            </Text>
            <Animated.View style={arrowAnimatedStyle}>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textSecondary}
              />
            </Animated.View>
          </Pressable>

          {isTranscriptExpanded && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.transcriptSection}
            >
              {session.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </Animated.View>
          )}
        </Animated.View>

        {/* Delete Button at Bottom */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.bottomActions}>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteSessionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.deleteSessionText}>Delete Session</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
  headerDate: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  summaryText: {
    ...typography.bodyLarge,
    color: colors.text,
    lineHeight: 28.8,
  },
  tagsSection: {
    marginTop: spacing.md,
  },
  tagLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.tagBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  emotionTag: {
    // Optional different styling for emotion tags
  },
  tagText: {
    ...typography.small,
    color: colors.text,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  expandButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  transcriptSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  bottomActions: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  deleteSessionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  deleteSessionText: {
    ...typography.caption,
    color: colors.delete,
  },
});
