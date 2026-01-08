import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/theme';
import { haptics } from '../../src/services/haptics';
import { getPersonalKnowledge, savePersonalKnowledge } from '../../src/services/database';

interface Fact {
  id: string;
  date: string;
  content: string;
  rawLine: string;
}

interface Section {
  name: string;
  facts: Fact[];
}

function parseKnowledgeDocument(content: string): Section[] {
  if (!content.trim()) return [];

  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let factIndex = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for section header (## CATEGORY)
    if (trimmedLine.startsWith('## ')) {
      const sectionName = trimmedLine.substring(3).trim();
      currentSection = { name: sectionName, facts: [] };
      sections.push(currentSection);
    }
    // Check for fact line ([YYYY-MM-DD] content or just content)
    else if (trimmedLine && currentSection) {
      const dateMatch = trimmedLine.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/);
      if (dateMatch) {
        currentSection.facts.push({
          id: `fact-${factIndex++}`,
          date: dateMatch[1],
          content: dateMatch[2],
          rawLine: line,
        });
      } else if (trimmedLine && !trimmedLine.startsWith('#')) {
        // Non-date fact line
        currentSection.facts.push({
          id: `fact-${factIndex++}`,
          date: '',
          content: trimmedLine,
          rawLine: line,
        });
      }
    }
  }

  return sections;
}

function rebuildDocument(sections: Section[]): string {
  if (sections.length === 0) return '';

  return sections
    .filter(section => section.facts.length > 0)
    .map(section => {
      const header = `## ${section.name}`;
      const facts = section.facts.map(fact => {
        if (fact.date) {
          return `[${fact.date}] ${fact.content}`;
        }
        return fact.content;
      }).join('\n');
      return `${header}\n${facts}`;
    })
    .join('\n\n');
}

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  const lower = name.toLowerCase();
  if (lower.includes('biograph')) return 'person-outline';
  if (lower.includes('relationship')) return 'people-outline';
  if (lower.includes('goal')) return 'flag-outline';
  if (lower.includes('habit')) return 'refresh-outline';
  if (lower.includes('prefer')) return 'heart-outline';
  if (lower.includes('work') || lower.includes('career')) return 'briefcase-outline';
  if (lower.includes('health')) return 'fitness-outline';
  if (lower.includes('hobby') || lower.includes('interest')) return 'game-controller-outline';
  return 'document-text-outline';
}

interface FactCardProps {
  fact: Fact;
  onDelete: () => void;
}

function FactCard({ fact, onDelete }: FactCardProps) {
  const handleDelete = () => {
    haptics.light();
    Alert.alert(
      'Delete Fact',
      'Remove this fact from your personal knowledge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <View style={factStyles.card}>
      <View style={factStyles.contentRow}>
        <View style={factStyles.textContainer}>
          <Text style={factStyles.content}>{fact.content}</Text>
          {fact.date && (
            <Text style={factStyles.date}>{fact.date}</Text>
          )}
        </View>
        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          style={({ pressed }) => [
            factStyles.deleteButton,
            pressed && factStyles.deleteButtonPressed,
          ]}
        >
          <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>
    </View>
  );
}

const factStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  content: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  date: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteButtonPressed: {
    opacity: 0.5,
  },
});

interface SectionCardProps {
  section: Section;
  onDeleteFact: (factId: string) => void;
  animationDelay: number;
}

function SectionCard({ section, onDeleteFact, animationDelay }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const icon = getCategoryIcon(section.name);

  const toggleExpanded = () => {
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(300)}
      style={sectionStyles.container}
    >
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [
          sectionStyles.header,
          pressed && sectionStyles.headerPressed,
        ]}
      >
        <View style={sectionStyles.headerLeft}>
          <Ionicons name={icon} size={20} color={colors.primary} />
          <Text style={sectionStyles.title}>{section.name}</Text>
        </View>
        <View style={sectionStyles.headerRight}>
          <Text style={sectionStyles.count}>{section.facts.length}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <View style={sectionStyles.factsContainer}>
          {section.facts.map(fact => (
            <FactCard
              key={fact.id}
              fact={fact}
              onDelete={() => onDeleteFact(fact.id)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.bodySemibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  count: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  factsContainer: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
  },
});

export default function PersonalKnowledgeScreen() {
  const router = useRouter();
  const [rawKnowledge, setRawKnowledge] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sections = useMemo(() => parseKnowledgeDocument(rawKnowledge), [rawKnowledge]);

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      const content = await getPersonalKnowledge();
      setRawKnowledge(content);
    } catch (error) {
      console.error('Failed to load personal knowledge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFact = useCallback(async (factId: string) => {
    // Find and remove the fact from sections
    const updatedSections = sections.map(section => ({
      ...section,
      facts: section.facts.filter(f => f.id !== factId),
    })).filter(section => section.facts.length > 0);

    // Rebuild the document
    const newDocument = rebuildDocument(updatedSections);

    setIsSaving(true);
    try {
      await savePersonalKnowledge(newDocument);
      setRawKnowledge(newDocument);
      haptics.success();
    } catch (error) {
      console.error('Failed to save after deletion:', error);
      Alert.alert('Error', 'Failed to delete fact. Please try again.');
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  }, [sections]);

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const totalFacts = sections.reduce((sum, s) => sum + s.facts.length, 0);

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

          <Text style={styles.title}>Personal Knowledge</Text>

          <View style={styles.placeholder} />
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={styles.descriptionContainer}
        >
          <Text style={styles.description}>
            Facts Alma has learned about you.{'\n'}
            Tap a fact to delete it.
          </Text>
        </Animated.View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sections.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(300)}
            style={styles.emptyContainer}
          >
            <Ionicons
              name="library-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No facts yet</Text>
            <Text style={styles.emptySubtitle}>
              Alma will learn about you{'\n'}through your conversations.
            </Text>
          </Animated.View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeIn.delay(150).duration(300)}
              style={styles.summaryContainer}
            >
              <Text style={styles.summaryText}>
                {sections.length} categor{sections.length === 1 ? 'y' : 'ies'} · {totalFacts} fact{totalFacts === 1 ? '' : 's'}
              </Text>
            </Animated.View>

            {sections.map((section, index) => (
              <SectionCard
                key={section.name}
                section={section}
                onDeleteFact={handleDeleteFact}
                animationDelay={200 + index * 50}
              />
            ))}

            {isSaving && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.savingText}>Saving...</Text>
              </View>
            )}
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
  summaryContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  savingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  savingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
