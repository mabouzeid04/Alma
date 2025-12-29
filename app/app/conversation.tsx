import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../src/theme';
import {
  RecordButton,
  MessageBubble,
  ConversationStatus,
} from '../src/components';
import { useSession } from '../src/hooks';
import { haptics } from '../src/services/haptics';

export default function ConversationScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    currentSession,
    conversationState,
    isRecording,
    messages,
    startSession,
    startRecording,
    stopRecording,
    endSession,
  } = useSession();

  // Start session when screen mounts
  useEffect(() => {
    startSession();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleRecordPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleEndSession = useCallback(() => {
    Alert.alert(
      'End Session?',
      'Your conversation will be saved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await endSession();
            haptics.sessionEnded();
            router.back();
          },
        },
      ]
    );
  }, [endSession, router]);

  const handleClose = useCallback(() => {
    if (messages.length > 1) {
      handleEndSession();
    } else {
      router.back();
    }
  }, [messages.length, handleEndSession, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            hitSlop={20}
          >
            <Text style={styles.closeText}>
              {messages.length > 1 ? 'Done' : 'Cancel'}
            </Text>
          </Pressable>

          <ConversationStatus state={conversationState} />

          <View style={styles.headerSpacer} />
        </Animated.View>
      </SafeAreaView>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            showTimestamp={index === messages.length - 1}
          />
        ))}

        {/* Processing indicator */}
        {conversationState === 'processing' && (
          <Animated.View
            entering={FadeInDown}
            exiting={FadeOut}
            style={styles.processingContainer}
          >
            <View style={styles.processingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.controlsContainer}
        >
          <View style={styles.recordWrapper}>
            <RecordButton
              isRecording={isRecording}
              onPress={handleRecordPress}
              size={72}
              disabled={conversationState === 'processing'}
            />
          </View>

          <Text style={styles.hint}>
            {isRecording
              ? 'Tap to stop'
              : conversationState === 'processing'
              ? 'Processing...'
              : 'Tap to speak'}
          </Text>
        </Animated.View>
      </SafeAreaView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closeText: {
    ...typography.headline,
    color: colors.primary,
  },
  headerSpacer: {
    width: 60,
  },
  pressed: {
    opacity: 0.6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  processingContainer: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  processingBubble: {
    backgroundColor: colors.aiBubble,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  bottomSafeArea: {
    backgroundColor: colors.background,
  },
  controlsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recordWrapper: {
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
});
