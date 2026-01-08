import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/services/haptics';
import { useTheories } from '../../src/hooks';
import { TheoryCard } from '../../src/components/TheoryCard';

export default function TheoriesScreen() {
  const router = useRouter();
  const { theories, isLoading, deleteTheory } = useTheories();

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleDeleteTheory = useCallback(async (id: string) => {
    try {
      await deleteTheory(id);
      haptics.success();
    } catch (error) {
      console.error('Failed to delete theory:', error);
      haptics.error();
    }
  }, [deleteTheory]);

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

          <Text style={styles.title}>Theories</Text>

          <View style={styles.placeholder} />
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={styles.descriptionContainer}
        >
          <Text style={styles.description}>
            Deeper insights Alma has developed about you over time.{'\n'}
            Delete any that feel inaccurate.
          </Text>
        </Animated.View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : theories.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(300)}
            style={styles.emptyContainer}
          >
            <Ionicons
              name="bulb-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No theories yet</Text>
            <Text style={styles.emptySubtitle}>
              Alma needs more time to develop{'\n'}deeper insights about you.
            </Text>
          </Animated.View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {theories.map((theory, index) => (
              <Animated.View
                key={theory.id}
                entering={FadeInDown.delay(100 + index * 50).duration(300)}
              >
                <TheoryCard
                  theory={theory}
                  onDelete={() => handleDeleteTheory(theory.id)}
                />
              </Animated.View>
            ))}
          </ScrollView>
        )}
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
  descriptionContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
