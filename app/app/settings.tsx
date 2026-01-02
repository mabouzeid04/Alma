import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../src/theme';
import { haptics } from '../src/services/haptics';
import { getPersonalKnowledge, savePersonalKnowledge } from '../src/services/database';

export default function SettingsScreen() {
  const router = useRouter();
  const [knowledge, setKnowledge] = useState('');
  const [originalKnowledge, setOriginalKnowledge] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = knowledge !== originalKnowledge;

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      const content = await getPersonalKnowledge();
      setKnowledge(content);
      setOriginalKnowledge(content);
    } catch (error) {
      console.error('Failed to load personal knowledge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    haptics.light();

    try {
      await savePersonalKnowledge(knowledge);
      setOriginalKnowledge(knowledge);
      haptics.success();
    } catch (error) {
      console.error('Failed to save personal knowledge:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  }, [knowledge, hasChanges]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              haptics.light();
              router.back();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleSave();
              router.back();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      haptics.light();
      router.back();
    }
  }, [hasChanges, handleSave, router]);

  const placeholderText = `Your personal knowledge base is empty.

The AI will automatically extract persistent facts from your conversations, like:

## BIOGRAPHICAL
[2024-01-15] Works at Google as a software engineer
[2024-01-10] Lives in San Francisco

## RELATIONSHIPS
[2024-01-15] Dating Sarah (met in college)
[2024-01-10] Close friends with Mike and Alex

## GOALS
[2024-01-12] Training for a marathon in April

You can also add facts manually here.`;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.header}
          >
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              hitSlop={20}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>

            <Text style={styles.title}>Personal Knowledge</Text>

            <Pressable
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                (!hasChanges || isSaving) && styles.saveButtonDisabled,
              ]}
              hitSlop={20}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  (!hasChanges || isSaving) && styles.saveButtonTextDisabled,
                ]}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Description */}
          <Animated.View
            entering={FadeIn.delay(100).duration(300)}
            style={styles.descriptionContainer}
          >
            <Text style={styles.description}>
              These are persistent facts about you that the AI remembers across all conversations.
              Edit freely - changes are saved when you tap Save.
            </Text>
          </Animated.View>

          {/* Editor */}
          <Animated.View
            entering={FadeIn.delay(200).duration(300)}
            style={styles.editorContainer}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.editor}
                  value={knowledge}
                  onChangeText={setKnowledge}
                  placeholder={placeholderText}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  autoCorrect
                  scrollEnabled={false}
                />
              </ScrollView>
            )}
          </Animated.View>

          {/* Format hint */}
          <Animated.View
            entering={FadeIn.delay(300).duration(300)}
            style={styles.hintContainer}
          >
            <Text style={styles.hintText}>
              Format: ## CATEGORY on its own line, then [YYYY-MM-DD] fact
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
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
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  buttonPressed: {
    opacity: 0.6,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  saveButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  saveButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
  descriptionContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  editor: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 300,
  },
  hintContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  hintText: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.6,
    textAlign: 'center',
  },
});
