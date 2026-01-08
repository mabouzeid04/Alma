import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, typography } from '../src/theme';
import { haptics } from '../src/services/haptics';
import { JournalSession, MemoryNode } from '../src/types';
import * as database from '../src/services/database';

export default function SummaryScreen() {
  const router = useRouter();
  const { sessionId: routeSessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<JournalSession | null>(null);
  const [memoryNode, setMemoryNode] = useState<MemoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLatestSession();
  }, []);

  const loadLatestSession = async () => {
    setIsLoading(true);
    try {
      // Use the sessionId from route params if available
      const targetSessionId = routeSessionId || (await database.getAllSessions())[0]?.id;

      if (!targetSessionId) {
        console.error('No session ID available');
        router.replace('/');
        return;
      }

      const session = await database.getSession(targetSessionId);
      if (!session) {
        console.error('Session not found:', targetSessionId);
        router.replace('/');
        return;
      }

      setSession(session);

      const memory = await database.getMemoryNodeForSession(targetSessionId);
      setMemoryNode(memory);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    haptics.light();
    router.replace('/');
  };

  const handleViewTranscript = () => {
    if (session) {
      haptics.light();
      router.push(`/session/${session.id}`);
    }
  };

  // Swipe down gesture to close
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100) {
        handleClose();
      }
    });

  const timestamp = session?.endedAt
    ? format(session.endedAt, 'h:mm a')
    : '';

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <Animated.View
            entering={FadeIn.delay(100)}
            style={styles.header}
          >
            <View style={styles.headerSpacer} />

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              hitSlop={20}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your summary...</Text>
              </View>
            ) : (
              <>
                {/* Title */}
                <Animated.View
                  entering={FadeInUp.delay(200).springify()}
                  style={styles.titleContainer}
                >
                  <Text style={styles.title}>Session Summary</Text>
                </Animated.View>

                {/* Summary Text */}
                <Animated.View
                  entering={FadeInUp.delay(300).springify()}
                  style={styles.summaryContainer}
                >
                  <Text style={styles.summaryText}>
                    {memoryNode?.summary || 'Processing your session...'}
                  </Text>
                </Animated.View>

            {/* Topics */}
            {memoryNode?.topics && memoryNode.topics.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(400).springify()}
                style={styles.section}
              >
                <Text style={styles.sectionLabel}>Topics:</Text>
                <View style={styles.tagsContainer}>
                  {memoryNode.topics.map((topic, index) => (
                    <Animated.View
                      key={topic}
                      entering={FadeIn.delay(450 + index * 50).duration(200)}
                    >
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{topic}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Emotions */}
            {memoryNode?.emotions && memoryNode.emotions.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(500).springify()}
                style={styles.section}
              >
                <Text style={styles.sectionLabel}>Emotions:</Text>
                <View style={styles.tagsContainer}>
                  {memoryNode.emotions.map((emotion, index) => (
                    <Animated.View
                      key={emotion}
                      entering={FadeIn.delay(550 + index * 50).duration(200)}
                    >
                      <View style={[styles.tag, styles.emotionTag]}>
                        <Text style={styles.tagText}>{emotion}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* View Transcript Button */}
            <Animated.View
              entering={FadeInUp.delay(600).springify()}
              style={styles.buttonContainer}
            >
              <Pressable
                onPress={handleViewTranscript}
                style={({ pressed }) => [
                  styles.transcriptButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.transcriptButtonText}>
                  View Full Transcript
                </Text>
              </Pressable>
            </Animated.View>

                {/* Confirmation */}
                <Animated.View
                  entering={FadeIn.delay(700)}
                  style={styles.confirmationContainer}
                >
                  <Text style={styles.confirmationText}>
                    Session saved · {timestamp}
                  </Text>
                </Animated.View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  titleContainer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  summaryContainer: {
    marginBottom: spacing.xl,
  },
  summaryText: {
    ...typography.bodyLarge,
    color: colors.text,
    lineHeight: 28.8, // 1.6 line height for readability
    textAlign: 'left',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs, // 6px between tags
  },
  tag: {
    backgroundColor: colors.tagBackground,
    paddingHorizontal: spacing.sm, // 12px padding
    paddingVertical: 6,
    borderRadius: borderRadius.sm, // 12px corner radius
  },
  emotionTag: {
    // Optional: different styling for emotions
  },
  tagText: {
    ...typography.small,
    color: colors.text,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  transcriptButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: borderRadius.lg,
  },
  transcriptButtonText: {
    ...typography.body,
    color: colors.text,
  },
  confirmationContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  confirmationText: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
});
