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
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { colors, spacing, typography, borderRadius } from '../../src/theme';
import { MessageBubble } from '../../src/components';
import { useSessions } from '../../src/hooks';
import { haptics } from '../../src/services/haptics';
import { JournalSession } from '../../src/types';
import * as database from '../../src/services/database';
import { MemoryNode } from '../../src/types';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteSession } = useSessions();
  const [session, setSession] = useState<JournalSession | null>(null);
  const [memoryNode, setMemoryNode] = useState<MemoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      'Delete Session?',
      'This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteSession(id);
              haptics.success();
              router.back();
            }
          },
        },
      ]
    );
  }, [id, deleteSession, router]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

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
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>Session</Text>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
            hitSlop={20}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Info */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.infoCard}>
          <Text style={styles.dateText}>
            {format(session.startedAt, "EEEE, MMMM d 'at' h:mm a")}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(session.duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.messages.length}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.wordCount}</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
          </View>
        </Animated.View>

        {/* Memory Summary */}
        {memoryNode && memoryNode.summary && (
          <Animated.View entering={FadeInUp.delay(150)} style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{memoryNode.summary}</Text>

            {memoryNode.topics.length > 0 && (
              <View style={styles.tagsContainer}>
                {memoryNode.topics.map((topic, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{topic}</Text>
                  </View>
                ))}
              </View>
            )}

            {memoryNode.emotions.length > 0 && (
              <View style={styles.emotionsContainer}>
                <Text style={styles.emotionsLabel}>Emotions:</Text>
                <Text style={styles.emotionsText}>
                  {memoryNode.emotions.join(', ')}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Messages */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.messagesSection}>
          <Text style={styles.sectionTitle}>Conversation</Text>
          {session.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.headline,
    color: colors.primary,
  },
  title: {
    ...typography.headline,
    color: colors.text,
  },
  deleteButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteText: {
    ...typography.headline,
    color: colors.error,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateText: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.title2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  summaryCard: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption1,
    color: colors.primary,
  },
  emotionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emotionsLabel: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  emotionsText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  messagesSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
});
