import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '../src/theme';
import {
  MessageBubble,
  WaveformVisualizer,
} from '../src/components';
import { useSession } from '../src/hooks';
import { haptics } from '../src/services/haptics';

type WaveformState = 'idle' | 'speaking' | 'processing' | 'aiSpeaking';

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

  // Map conversation state to waveform state
  const getWaveformState = (): WaveformState => {
    if (isRecording) return 'speaking';
    if (conversationState === 'processing') return 'processing';
    if (conversationState === 'responding') return 'aiSpeaking';
    return 'idle';
  };

  // Start session when screen mounts
  useEffect(() => {
    startSession();
    // Auto-start recording after session starts
    const timer = setTimeout(() => {
      startRecording();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Haptic feedback when AI starts responding
  useEffect(() => {
    if (conversationState === 'responding') {
      haptics.light();
    }
  }, [conversationState]);

  const handleEndSession = useCallback(async () => {
    // Check if session is very short (less than 10 seconds worth of content)
    if (messages.length <= 1) {
      Alert.alert(
        'Short Session',
        'Are you sure? Your session is very short.',
        [
          { text: 'Keep Talking', style: 'cancel' },
          {
            text: 'End Anyway',
            style: 'destructive',
            onPress: async () => {
              await endSession();
              haptics.sessionEnded();
              router.replace('/processing');
            },
          },
        ]
      );
    } else {
      await endSession();
      haptics.sessionEnded();
      router.replace('/processing');
    }
  }, [messages.length, endSession, router]);

  const handleDonePress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    handleEndSession();
  }, [isRecording, stopRecording, handleEndSession]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header - Done button only */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <View style={styles.headerSpacer} />

          <Pressable
            onPress={handleDonePress}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.pressed,
            ]}
            hitSlop={20}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {/* Chat Transcript */}
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
            showTimestamp={false}
          />
        ))}

        {/* AI Processing indicator */}
        {conversationState === 'processing' && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.processingContainer}
          >
            <View style={styles.processingBubble}>
              <View style={styles.typingDots}>
                <Animated.View
                  style={[styles.dot]}
                  entering={FadeIn.delay(0).duration(300)}
                />
                <Animated.View
                  style={[styles.dot]}
                  entering={FadeIn.delay(150).duration(300)}
                />
                <Animated.View
                  style={[styles.dot]}
                  entering={FadeIn.delay(300).duration(300)}
                />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Waveform - Bottom third */}
      <Animated.View
        entering={SlideInDown.delay(300).springify()}
        style={styles.waveformContainer}
      >
        <WaveformVisualizer
          state={getWaveformState()}
          barCount={12}
          height={80}
        />
      </Animated.View>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
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
  },
  headerSpacer: {
    flex: 1,
  },
  doneButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  doneText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
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
    marginHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  processingBubble: {
    backgroundColor: colors.aiBubble,
    borderRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.xs,
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
    opacity: 0.6,
  },
  waveformContainer: {
    paddingBottom: spacing.sm,
  },
  bottomSafe: {
    backgroundColor: colors.background,
  },
});
