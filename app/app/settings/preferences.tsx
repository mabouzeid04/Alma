import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { haptics } from '../../src/services/haptics';
import { clearAllSessions } from '../../src/services/database';

export default function PreferencesScreen() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleDeleteAllData = useCallback(() => {
    haptics.warning();
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your journal sessions, memories, patterns, theories, and personal knowledge. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await clearAllSessions();
              haptics.medium();
              Alert.alert('Done', 'All data has been deleted.', [
                { text: 'OK', onPress: () => router.replace('/') },
              ]);
            } catch (error) {
              console.error('Failed to delete data:', error);
              Alert.alert('Error', 'Failed to delete data. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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

          <Text style={styles.title}>Preferences</Text>

          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Data Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={styles.sectionTitle}>DATA</Text>

            <Pressable
              onPress={handleDeleteAllData}
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              )}
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete All Data'}
              </Text>
            </Pressable>
            <Text style={styles.deleteHint}>
              Permanently removes all sessions, memories, patterns, and personal knowledge.
            </Text>
          </Animated.View>
        </ScrollView>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '500',
  },
  deleteHint: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
