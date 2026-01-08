/**
 * Personalization Service
 *
 * Gathers rich context for personalized conversations:
 * - Relevant patterns for topics being discussed
 * - Emotional baseline from recent sessions
 * - Unresolved questions the user keeps circling
 * - Natural timeframe references ("a few weeks ago")
 *
 * Philosophy: Make conversations feel like talking to someone who
 * genuinely knows you and remembers past discussions naturally.
 */

import {
  Pattern,
  MemoryNode,
  JournalSession,
  EmotionalBaseline,
  TopicHistory,
  PastReference,
  ConversationContext,
  Theory,
} from '../types';
import * as db from './database';
import { getConfirmedPatterns, getRelevantPatternsForContext, getUnresolvedQuestions } from './patterns';
import { getRelevantTheories, formatTheoriesForPrompt } from './theories';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a date to natural timeframe reference
 * "a few days ago", "last week", "a couple weeks ago", "last month", etc.
 */
function toNaturalTimeframe(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays <= 1) return 'yesterday';
  if (diffDays <= 3) return 'a few days ago';
  if (diffDays <= 7) return 'earlier this week';
  if (diffWeeks === 1) return 'last week';
  if (diffWeeks === 2) return 'a couple weeks ago';
  if (diffWeeks <= 4) return 'a few weeks ago';
  if (diffMonths === 1) return 'last month';
  if (diffMonths <= 2) return 'a month or two ago';
  if (diffMonths <= 3) return 'a few months ago';
  return 'a while back';
}

/**
 * Extract dominant emotions from a set of memory nodes
 */
function extractDominantEmotions(memories: MemoryNode[], limit: number = 5): string[] {
  const emotionCounts: Record<string, number> = {};

  for (const memory of memories) {
    for (const emotion of memory.emotions || []) {
      const normalized = emotion.toLowerCase().trim();
      emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
    }
  }

  return Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([emotion]) => emotion);
}

/**
 * Determine emotional trend from recent sessions
 */
function analyzeEmotionalTrend(
  recentMemories: MemoryNode[]
): { trend: EmotionalBaseline['trend']; narrative: string } {
  if (recentMemories.length < 2) {
    return { trend: 'stable', narrative: '' };
  }

  // Categorize emotions
  const positiveEmotions = ['happy', 'excited', 'content', 'peaceful', 'grateful', 'hopeful', 'energized', 'confident'];
  const negativeEmotions = ['stressed', 'anxious', 'frustrated', 'sad', 'overwhelmed', 'angry', 'worried', 'exhausted'];

  // Score each session
  const scores: number[] = [];
  for (const memory of recentMemories) {
    let score = 0;
    for (const emotion of memory.emotions || []) {
      const normalized = emotion.toLowerCase();
      if (positiveEmotions.some((e) => normalized.includes(e))) score += 1;
      if (negativeEmotions.some((e) => normalized.includes(e))) score -= 1;
    }
    scores.push(score);
  }

  // Analyze trend (earlier to later)
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;

  if (diff > 0.5) {
    return {
      trend: 'improving',
      narrative: "You've seemed more positive lately compared to before",
    };
  } else if (diff < -0.5) {
    const recentNegative = recentMemories
      .slice(-3)
      .flatMap((m) => m.emotions || [])
      .filter((e) => negativeEmotions.some((ne) => e.toLowerCase().includes(ne)));
    if (recentNegative.length > 0) {
      return {
        trend: 'declining',
        narrative: `You've seemed more ${recentNegative[0]} lately`,
      };
    }
    return {
      trend: 'declining',
      narrative: "You've seemed more stressed lately",
    };
  } else if (Math.abs(diff) <= 0.5 && scores.some((s) => s > 0) && scores.some((s) => s < 0)) {
    return {
      trend: 'mixed',
      narrative: "You've had a mix of good and tough days recently",
    };
  }

  return { trend: 'stable', narrative: '' };
}

/**
 * Check if current context suggests emotional deviation from baseline
 */
function detectEmotionalDeviation(
  currentContext: string,
  baseline: EmotionalBaseline
): string | undefined {
  const contextLower = currentContext.toLowerCase();

  // Check for emotional words in current context
  const positiveIndicators = ['great', 'amazing', 'excited', 'happy', 'good', 'awesome', 'fantastic'];
  const negativeIndicators = ['stressed', 'anxious', 'frustrated', 'angry', 'worried', 'overwhelmed', 'tired', 'exhausted'];

  const hasPositive = positiveIndicators.some((w) => contextLower.includes(w));
  const hasNegative = negativeIndicators.some((w) => contextLower.includes(w));

  // If they're expressing positive and their baseline is negative
  if (hasPositive && baseline.dominantEmotions.some((e) =>
    negativeIndicators.some((n) => e.includes(n))
  )) {
    return "This seems more positive than how you've been feeling lately";
  }

  // If they're expressing negative and their baseline is positive
  if (hasNegative && baseline.dominantEmotions.every((e) =>
    !negativeIndicators.some((n) => e.includes(n))
  ) && baseline.dominantEmotions.length > 0) {
    return "This seems different from your usual energy";
  }

  return undefined;
}

/**
 * Find past discussions about specific topics
 */
async function findTopicHistory(
  topic: string,
  sessions: JournalSession[],
  memories: Map<string, MemoryNode>,
  patterns: Pattern[],
  limit: number = 3
): Promise<TopicHistory | null> {
  const topicLower = topic.toLowerCase();
  const pastDiscussions: PastReference[] = [];

  for (const session of sessions) {
    const memory = memories.get(session.id);
    if (!memory) continue;

    // Check if this session discussed the topic
    const topicsMatch = memory.topics.some((t) => t.toLowerCase().includes(topicLower));
    const summaryMatch = memory.summary.toLowerCase().includes(topicLower);

    if (topicsMatch || summaryMatch) {
      pastDiscussions.push({
        summary: memory.summary,
        emotionalContext: memory.emotions.length > 0
          ? `felt ${memory.emotions.slice(0, 2).join(' and ')}`
          : '',
        timeframeNatural: toNaturalTimeframe(session.startedAt),
        sessionDate: session.startedAt,
        sessionId: session.id,
      });
    }
  }

  if (pastDiscussions.length === 0) return null;

  // Sort by date (most recent first) and limit
  pastDiscussions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  const limitedDiscussions = pastDiscussions.slice(0, limit);

  // Find related pattern (opinion evolution)
  const relatedPattern = patterns.find(
    (p) =>
      p.patternType === 'opinion_evolution' &&
      p.subject?.toLowerCase().includes(topicLower)
  );

  return {
    topic,
    pastDiscussions: limitedDiscussions,
    opinionEvolution: relatedPattern?.description,
    relatedPattern,
  };
}

/**
 * Extract potential topics from current context
 */
function extractTopicsFromContext(context: string): string[] {
  // Simple keyword extraction - look for nouns and proper nouns
  const words = context.split(/\s+/).filter((w) => w.length > 3);
  const candidates: string[] = [];

  // Look for capitalized words (names, places)
  for (const word of words) {
    const cleaned = word.replace(/[^\w]/g, '');
    if (cleaned.length > 2 && /^[A-Z]/.test(cleaned)) {
      candidates.push(cleaned.toLowerCase());
    }
  }

  // Add common topic triggers
  const topicPatterns = [
    /(?:my |the )?(work|job|career|project)/gi,
    /(?:my |the )?(girlfriend|boyfriend|partner|wife|husband)/gi,
    /(?:my )?(mom|dad|mother|father|parents|family)/gi,
    /(?:my )?(friend|friends)/gi,
    /(?:my )?(school|college|university|class|classes)/gi,
    /(?:the )?(meeting|interview|presentation)/gi,
  ];

  for (const pattern of topicPatterns) {
    const matches = context.match(pattern);
    if (matches) {
      candidates.push(...matches.map((m) => m.toLowerCase().trim()));
    }
  }

  // Deduplicate
  return [...new Set(candidates)];
}

/**
 * Identify opportunities for deeper probing based on context and patterns
 */
function identifyProbeOpportunities(
  currentContext: string,
  unresolvedQuestions: Pattern[],
  topicHistories: TopicHistory[]
): string[] {
  const opportunities: string[] = [];

  // Check if they're circling an unresolved question
  for (const question of unresolvedQuestions) {
    const subject = question.subject?.toLowerCase() || '';
    if (currentContext.toLowerCase().includes(subject)) {
      opportunities.push(
        `They're talking about "${question.subject}" which they've brought up ${question.relatedSessions.length} times without resolving: ${question.description}`
      );
    }
  }

  // Check for opinion evolution opportunities
  for (const history of topicHistories) {
    if (history.opinionEvolution) {
      opportunities.push(
        `They're discussing "${history.topic}" - their feelings have evolved: ${history.opinionEvolution}`
      );
    }
  }

  // Check for new mentions (people, topics mentioned for first time)
  const namePatternsContext = /\b([A-Z][a-z]+)\b/g;
  const potentialNames = currentContext.match(namePatternsContext) || [];
  for (const name of potentialNames) {
    const nameLower = name.toLowerCase();
    // Check if this name hasn't been discussed before
    const isKnown = topicHistories.some(
      (h) => h.topic.toLowerCase().includes(nameLower)
    );
    if (!isKnown && name.length > 2) {
      opportunities.push(`New person mentioned: "${name}" - might want to ask who they are`);
    }
  }

  return opportunities.slice(0, 5); // Limit to top 5
}

// =============================================================================
// Main Context Builder
// =============================================================================

/**
 * Build rich personalized context for a conversation
 */
export async function buildConversationContext(
  currentContext: string,
  allMemories: MemoryNode[]
): Promise<ConversationContext> {
  // Get recent sessions (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentSessions = await db.getSessionsInDateRange(threeMonthsAgo, new Date());

  // Build memory lookup map
  const memoryMap = new Map<string, MemoryNode>();
  for (const memory of allMemories) {
    memoryMap.set(memory.sessionId, memory);
  }

  // Get patterns
  const confirmedPatterns = await getConfirmedPatterns();
  const relevantPatterns = await getRelevantPatternsForContext(currentContext);
  const unresolvedQuestions = await getUnresolvedQuestions();
  const relationshipPatterns = confirmedPatterns.filter(
    (p) => p.patternType === 'relationship'
  );

  // Build emotional baseline from recent sessions (last 2 weeks)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentMemories = allMemories.filter(
    (m) => m.createdAt >= twoWeeksAgo
  );

  const dominantEmotions = extractDominantEmotions(recentMemories, 5);
  const { trend, narrative } = analyzeEmotionalTrend(recentMemories);
  const recentEmotions = recentMemories
    .slice(-3)
    .flatMap((m) => m.emotions || [])
    .slice(0, 5);

  const emotionalBaseline: EmotionalBaseline = {
    dominantEmotions,
    recentEmotions: [...new Set(recentEmotions)],
    trend,
    trendNarrative: narrative,
    deviationFromBaseline: detectEmotionalDeviation(currentContext, {
      dominantEmotions,
      recentEmotions,
      trend,
      trendNarrative: narrative,
    }),
  };

  // Build topic histories for topics mentioned in current context
  const topicsInContext = extractTopicsFromContext(currentContext);
  const topicHistories: TopicHistory[] = [];

  for (const topic of topicsInContext) {
    const history = await findTopicHistory(
      topic,
      recentSessions,
      memoryMap,
      confirmedPatterns
    );
    if (history) {
      topicHistories.push(history);
    }
  }

  // Identify probe opportunities
  const probeOpportunities = identifyProbeOpportunities(
    currentContext,
    unresolvedQuestions,
    topicHistories
  );

  // Let flow signals (topics they seem done with - resolved patterns)
  const resolvedPatterns = await db.getAllPatterns();
  const letFlowSignals = resolvedPatterns
    .filter((p) => p.status === 'resolved')
    .map((p) => `"${p.subject}" seems resolved - they worked through this`)
    .slice(0, 3);

  // Get relevant theories for deeper understanding
  let relevantTheories: Theory[] = [];
  try {
    relevantTheories = await getRelevantTheories(currentContext);
  } catch (error) {
    console.warn('Failed to get relevant theories:', error);
  }

  return {
    relevantPatterns,
    emotionalBaseline,
    unresolvedQuestions,
    topicHistories,
    relationshipPatterns,
    relevantTheories,
    probeOpportunities,
    letFlowSignals,
  };
}

/**
 * Format conversation context for the AI system prompt
 */
export function formatContextForPrompt(context: ConversationContext): string {
  const sections: string[] = [];

  // Emotional baseline
  if (context.emotionalBaseline.dominantEmotions.length > 0) {
    let emotionalSection = `EMOTIONAL BASELINE:\n`;
    emotionalSection += `- Typical emotions lately: ${context.emotionalBaseline.dominantEmotions.join(', ')}\n`;
    if (context.emotionalBaseline.trendNarrative) {
      emotionalSection += `- ${context.emotionalBaseline.trendNarrative}\n`;
    }
    if (context.emotionalBaseline.deviationFromBaseline) {
      emotionalSection += `- NOTE: ${context.emotionalBaseline.deviationFromBaseline}\n`;
    }
    sections.push(emotionalSection.trim());
  }

  // Relevant patterns
  if (context.relevantPatterns.length > 0) {
    let patternSection = 'PATTERNS YOU\'VE NOTICED:\n';
    for (const pattern of context.relevantPatterns.slice(0, 3)) {
      patternSection += `- ${pattern.description}\n`;
      if (pattern.evidenceQuotes.length > 0) {
        patternSection += `  (They said: "${pattern.evidenceQuotes[0]}")\n`;
      }
    }
    sections.push(patternSection.trim());
  }

  // Topic histories with natural references
  if (context.topicHistories.length > 0) {
    let topicSection = 'RELEVANT PAST CONVERSATIONS:\n';
    for (const history of context.topicHistories.slice(0, 3)) {
      if (history.pastDiscussions.length > 0) {
        const ref = history.pastDiscussions[0];
        let entry = `- ${ref.timeframeNatural}, they talked about ${history.topic}: "${ref.summary}"`;
        if (ref.emotionalContext) {
          entry += ` (${ref.emotionalContext})`;
        }
        topicSection += entry + '\n';
      }
      if (history.opinionEvolution) {
        topicSection += `  Opinion evolution: ${history.opinionEvolution}\n`;
      }
    }
    sections.push(topicSection.trim());
  }

  // Unresolved questions they keep circling
  if (context.unresolvedQuestions.length > 0) {
    let questionSection = 'UNRESOLVED QUESTIONS THEY KEEP CIRCLING:\n';
    for (const q of context.unresolvedQuestions.slice(0, 3)) {
      questionSection += `- "${q.subject}": ${q.description}\n`;
    }
    sections.push(questionSection.trim());
  }

  // Relationship patterns
  if (context.relationshipPatterns.length > 0) {
    let relationshipSection = 'RELATIONSHIP DYNAMICS:\n';
    for (const rp of context.relationshipPatterns.slice(0, 3)) {
      relationshipSection += `- ${rp.subject}: ${rp.description}\n`;
    }
    sections.push(relationshipSection.trim());
  }

  // Working theories (background understanding)
  if (context.relevantTheories && context.relevantTheories.length > 0) {
    const theoriesSection = formatTheoriesForPrompt(context.relevantTheories);
    if (theoriesSection) {
      sections.push(theoriesSection.trim());
    }
  }

  // Probe opportunities (internal guidance)
  if (context.probeOpportunities.length > 0) {
    let probeSection = 'OPPORTUNITIES TO PROBE DEEPER:\n';
    for (const opportunity of context.probeOpportunities) {
      probeSection += `- ${opportunity}\n`;
    }
    sections.push(probeSection.trim());
  }

  return sections.join('\n\n');
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if conversation has enough context for personalization
 */
export async function hasPersonalizationContext(): Promise<boolean> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sessions = await db.getSessionsInDateRange(threeMonthsAgo, new Date());
  return sessions.length >= 3;
}

/**
 * Get a natural memory reference for a specific topic
 */
export async function getTopicReference(
  topic: string,
  allMemories: MemoryNode[]
): Promise<string | null> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sessions = await db.getSessionsInDateRange(threeMonthsAgo, new Date());

  const memoryMap = new Map<string, MemoryNode>();
  for (const memory of allMemories) {
    memoryMap.set(memory.sessionId, memory);
  }

  const patterns = await getConfirmedPatterns();
  const history = await findTopicHistory(topic, sessions, memoryMap, patterns, 1);

  if (!history || history.pastDiscussions.length === 0) return null;

  const ref = history.pastDiscussions[0];
  let reference = `${ref.timeframeNatural}, you talked about this`;
  if (ref.emotionalContext) {
    reference += ` - ${ref.emotionalContext}`;
  }

  return reference;
}
