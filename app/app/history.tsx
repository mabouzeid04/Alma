import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, typography } from '../src/theme';
import { SessionCard } from '../src/components';
import { useSessions } from '../src/hooks';
import { haptics } from '../src/services/haptics';
import { JournalSession } from '../src/types';

export default function HistoryScreen() {
  const router = useRouter();
  const { sessions, isLoading, loadSessions } = useSessions();

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleSessionPress = useCallback(
    (session: JournalSession) => {
      router.push(`/session/${session.id}`);
    },
    [router]
  );

  const renderSession = useCallback(
    ({ item, index }: { item: JournalSession; index: number }) => (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <SessionCard
          session={item}
          onPress={() => handleSessionPress(item)}
        />
      </Animated.View>
    ),
    [handleSessionPress]
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation to see your journal entries here
      </Text>
    </Animated.View>
  );

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

          <Text style={styles.title}>History</Text>

          <View style={styles.headerSpacer} />
        </Animated.View>
      </SafeAreaView>

      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadSessions}
            tintColor={colors.primary}
          />
        }
      />
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
  headerSpacer: {
    width: 60,
  },
  pressed: {
    opacity: 0.6,
  },
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
