import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/services/haptics';
import { SettingsMenuItem } from '../../src/components/SettingsMenuItem';
import { getAllPatterns } from '../../src/services/database';

export default function SettingsHubScreen() {
  const router = useRouter();
  const [patternsCount, setPatternsCount] = useState(0);

  const loadCounts = useCallback(async () => {
    try {
      const patterns = await getAllPatterns();
      // Only count non-deleted patterns
      const activePatterns = patterns.filter(p => !p.deletedAt);
      setPatternsCount(activePatterns.length);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  }, []);

  // Reload counts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts])
  );

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const navigateTo = useCallback((route: string) => {
    haptics.light();
    router.push(route as any);
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

          <Text style={styles.title}>Settings</Text>

          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* About You Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={styles.sectionTitle}>ABOUT YOU</Text>

            <SettingsMenuItem
              icon="person-circle-outline"
              title="Personal Knowledge"
              subtitle="Facts Alma remembers about you"
              onPress={() => navigateTo('/settings/personal-knowledge')}
            />

            <SettingsMenuItem
              icon="repeat-outline"
              title="Patterns"
              subtitle="Recurring themes Alma has noticed"
              badge={patternsCount}
              onPress={() => navigateTo('/settings/patterns')}
            />

            <SettingsMenuItem
              icon="bulb-outline"
              title="Theories"
              subtitle="Deeper hypotheses about you"
              badge={0}
              onPress={() => navigateTo('/settings/theories')}
            />
          </Animated.View>

          {/* App Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text style={styles.sectionTitle}>APP</Text>

            <SettingsMenuItem
              icon="settings-outline"
              title="Preferences"
              subtitle="Voice, notifications, appearance"
              onPress={() => navigateTo('/settings/preferences')}
            />
          </Animated.View>

          {/* Version */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={styles.versionContainer}
          >
            <Text style={styles.versionText}>Alma v1.0.0</Text>
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
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
