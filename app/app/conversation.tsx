import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
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
  const [showShortSessionModal, setShowShortSessionModal] = useState(false);
  const {
    currentSession,
    conversationState,
    isRecording,
    isEnding,
    messages,
    audioLevel,
    startSession,
    startRecording,
    stopRecording,
    prepareEndSession,
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
    const initSession = async () => {
      await startSession();
      // Greeting audio has finished, now start recording
      const started = await startRecording();
      console.log('Recording started:', started);
    };
    initSession();
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
    // Prevent multiple presses
    if (isEnding) return;

    // Check if session is very short (less than 10 seconds worth of content)
    if (messages.length <= 1) {
      setShowShortSessionModal(true);
    } else {
      try {
        // Prepare session (fast) and get session ID
        const sessionId = await prepareEndSession();
        if (sessionId) {
          // Navigate immediately with session ID for processing
          router.replace(`/processing?sessionId=${sessionId}`);
        }
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
  }, [messages.length, prepareEndSession, router, isEnding]);

  const handleConfirmEndShortSession = useCallback(async () => {
    // Prevent multiple presses
    if (isEnding) return;

    setShowShortSessionModal(false);
    try {
      const sessionId = await prepareEndSession();
      if (sessionId) {
        router.replace(`/processing?sessionId=${sessionId}`);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [prepareEndSession, router, isEnding]);

  const handleDonePress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    handleEndSession();
  }, [isRecording, stopRecording, handleEndSession]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']} testID="conversation-screen">
        {/* Header - Done button only */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <View style={styles.headerSpacer} />

          <Pressable
            onPress={handleDonePress}
            disabled={isEnding}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
              isEnding && styles.doneButtonDisabled,
            ]}
            hitSlop={12}
          >
            <Text style={[styles.doneText, isEnding && styles.doneTextDisabled]}>
              {isEnding ? 'Saving...' : 'Done'}
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {/* Short Session Confirmation Modal */}
      <Modal
        visible={showShortSessionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShortSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish session?</Text>
            <Text style={styles.modalMessage}>
              You haven't said much yet. Want to keep going?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowShortSessionModal(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={styles.modalButtonTextPrimary}>Keep Talking</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmEndShortSession}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={styles.modalButtonTextSecondary}>End Session</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Waveform - Bottom third - Tap to send */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <Animated.View
          entering={SlideInDown.delay(300).springify()}
          style={styles.waveformContainer}
        >
          <Pressable
            onPress={() => {
              if (isRecording) {
                console.log('Stopping recording to send...');
                stopRecording();
              } else if (conversationState === 'idle') {
                console.log('Starting recording...');
                startRecording();
              }
            }}
            style={styles.waveformTouchable}
          >
            <WaveformVisualizer
              state={getWaveformState()}
              particleCount={24}
              size={120}
              audioLevel={audioLevel}
            />
            <Text style={styles.waveformHint}>
              {isRecording ? 'Tap to send' : conversationState === 'idle' ? 'Tap to speak' : ''}
            </Text>
          </Pressable>
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
  },
  headerSpacer: {
    flex: 1,
  },
  doneButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },
  doneButtonPressed: {
    backgroundColor: colors.primary,
  },
  doneText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  doneButtonDisabled: {
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  doneTextDisabled: {
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  modalButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  modalButtonPressed: {
    opacity: 0.8,
  },
  modalButtonTextPrimary: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
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
  waveformTouchable: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  waveformHint: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.6,
    marginTop: spacing.sm,
  },
  bottomSafe: {
    backgroundColor: colors.background,
  },
});
