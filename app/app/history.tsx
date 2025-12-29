import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp, SlideInDown, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../src/theme';
import { useSessions } from '../src/hooks';
import { haptics } from '../src/services/haptics';
import { JournalSession, MemoryNode } from '../src/types';
import { format, isToday, isYesterday } from 'date-fns';
import * as database from '../src/services/database';

export default function HistoryScreen() {
  const router = useRouter();
  const { sessions, isLoading, loadSessions, deleteSession } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const [memoryNodes, setMemoryNodes] = useState<Record<string, MemoryNode>>({});

  // Load memory nodes for topics display
  React.useEffect(() => {
    loadMemoryNodes();
  }, [sessions]);

  const loadMemoryNodes = async () => {
    const nodes: Record<string, MemoryNode> = {};
    for (const session of sessions) {
      const memory = await database.getMemoryNodeForSession(session.id);
      if (memory) {
        nodes[session.id] = memory;
      }
    }
    setMemoryNodes(nodes);
  };

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter((session) => {
      // Search in transcript
      if (session.transcript.toLowerCase().includes(query)) return true;

      // Search in messages
      const messageMatch = session.messages.some((m) =>
        m.content.toLowerCase().includes(query)
      );
      if (messageMatch) return true;

      // Search in memory node topics
      const memory = memoryNodes[session.id];
      if (memory) {
        if (memory.summary?.toLowerCase().includes(query)) return true;
        if (memory.topics?.some((t) => t.toLowerCase().includes(query))) return true;
      }

      return false;
    });
  }, [sessions, searchQuery, memoryNodes]);

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

  const handleDeleteSession = useCallback(
    (session: JournalSession) => {
      Alert.alert(
        'Delete Session',
        "Delete this session? This can't be undone.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              haptics.warning();
              deleteSession(session.id);
            },
          },
        ]
      );
    },
    [deleteSession]
  );

  // Swipe down gesture to close
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100) {
        runOnJS(handleBack)();
      }
    });

  const renderSession = useCallback(
    ({ item, index }: { item: JournalSession; index: number }) => {
      const memory = memoryNodes[item.id];

      return (
        <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
          <SessionEntry
            session={item}
            memory={memory}
            onPress={() => handleSessionPress(item)}
            onDelete={() => handleDeleteSession(item)}
          />
        </Animated.View>
      );
    },
    [handleSessionPress, handleDeleteSession, memoryNodes]
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the orb on the home screen to start talking
      </Text>
    </Animated.View>
  );

  return (
    <GestureDetector gesture={panGesture}>
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
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>

            <Text style={styles.title}>History</Text>

            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Search Bar */}
          <Animated.View
            entering={SlideInDown.delay(100).springify()}
            style={styles.searchContainer}
          >
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search sessions..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>

        {/* Sessions List */}
        <FlatList
          data={filteredSessions}
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
    </GestureDetector>
  );
}

// Session Entry Component (new card style per spec)
interface SessionEntryProps {
  session: JournalSession;
  memory?: MemoryNode;
  onPress: () => void;
  onDelete: () => void;
}

function SessionEntry({ session, memory, onPress, onDelete }: SessionEntryProps) {
  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const getDateLabel = (): string => {
    const date = session.startedAt;
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const getTopicsText = (): string => {
    if (!memory?.topics || memory.topics.length === 0) {
      return '';
    }
    const topics = memory.topics.slice(0, 4);
    const text = topics.join(' · ');
    if (memory.topics.length > 4) {
      return text + ' ...';
    }
    return text;
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onDelete}
      style={({ pressed }) => [
        styles.entryContainer,
        pressed && styles.entryPressed,
      ]}
    >
      <Text style={styles.entryDate}>{getDateLabel()}</Text>
      <Text style={styles.entryTopics} numberOfLines={2}>
        {getTopicsText() || 'Processing...'}
      </Text>
    </Pressable>
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
    height: 60,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  pressed: {
    opacity: 0.6,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: spacing.xxs,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Session Entry Styles
  entryContainer: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  entryPressed: {
    opacity: 0.8,
  },
  entryDate: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  entryTopics: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.8,
  },
});
