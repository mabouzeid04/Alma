/**
 * Insights Service - AI-Powered Pattern Analysis
 *
 * Analyzes journal sessions to identify patterns, trends, and generate
 * narrative insights that feel like observations from a thoughtful friend.
 */

import { v4 as uuid } from 'uuid';
import {
  MemoryNode,
  InsightsReport,
  Insight,
  InsightPeriod,
  InsightType,
  InsightPriority,
  EmotionalSummary,
  TopicSummary,
  EmotionTrend,
  InsightEvidence,
  InsightConnection,
  GrowthIndicator,
  GrowthDirection,
  GrowthSnapshot,
  Pattern,
  JournalSession,
} from '../types';
import * as database from './database';
import { subDays, subMonths, format } from 'date-fns';
import { getConfirmedPatterns } from './patterns';
import { fetchWithRetry, createTimeoutController } from './api-utils';

// =============================================================================
// Configuration
// =============================================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_API_URL = 'https://api.openai.com/v1';
const XAI_API_URL = 'https://api.x.ai/v1';

const INSIGHTS_MODEL_PROVIDER = process.env.EXPO_PUBLIC_INSIGHTS_MODEL_PROVIDER as ModelProvider | undefined;
const INSIGHTS_MODEL = process.env.EXPO_PUBLIC_INSIGHTS_MODEL;

type ModelProvider = 'gemini' | 'openai' | 'xai';

const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-5-mini',
  xai: 'grok-4-1-fast-non-reasoning',
};

// Minimum sessions required to generate meaningful insights
export const MIN_SESSIONS_FOR_INSIGHTS = 3;

// Cache freshness thresholds (in hours)
const CACHE_FRESHNESS = {
  week: 24,      // 1 day
  month: 72,     // 3 days
  all_time: 168, // 1 week
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Generate or retrieve cached insights for a given period
 */
export async function getInsights(
  period: InsightPeriod,
  forceRefresh = false
): Promise<InsightsReport | null> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await database.getInsightsReportForPeriod(period);
    if (cached && isCacheFresh(cached.generatedAt, period)) {
      return cached;
    }
  }

  // Get memory nodes for the period
  const memoryNodes = await getMemoryNodesForPeriod(period);

  // Check if we have enough data
  if (memoryNodes.length < MIN_SESSIONS_FOR_INSIGHTS) {
    return null;
  }

  // Generate new insights
  const report = await generateInsightsReport(memoryNodes, period);

  // Cache the report
  if (report) {
    await database.saveInsightsReport(report);
  }

  return report;
}

/**
 * Check if we have enough sessions to generate insights
 */
export async function canGenerateInsights(period: InsightPeriod): Promise<boolean> {
  const memoryNodes = await getMemoryNodesForPeriod(period);
  return memoryNodes.length >= MIN_SESSIONS_FOR_INSIGHTS;
}

/**
 * Get the count of sessions available for a period
 */
export async function getSessionCountForPeriod(period: InsightPeriod): Promise<number> {
  const memoryNodes = await getMemoryNodesForPeriod(period);
  return memoryNodes.length;
}

// =============================================================================
// Data Retrieval
// =============================================================================

async function getMemoryNodesForPeriod(period: InsightPeriod): Promise<MemoryNode[]> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = subDays(now, 7);
      break;
    case 'month':
      startDate = subMonths(now, 1);
      break;
    case 'all_time':
      startDate = new Date(0); // Beginning of time
      break;
  }

  return database.getMemoryNodesInDateRange(startDate, now);
}

function isCacheFresh(generatedAt: Date, period: InsightPeriod): boolean {
  const hoursOld = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);
  return hoursOld < CACHE_FRESHNESS[period];
}

// =============================================================================
// Insights Generation
// =============================================================================

async function generateInsightsReport(
  memoryNodes: MemoryNode[],
  period: InsightPeriod
): Promise<InsightsReport | null> {
  const hasAnyModelKey = !!(GEMINI_API_KEY || OPENAI_API_KEY || XAI_API_KEY);
  if (!hasAnyModelKey) {
    console.warn('No API key available for insights generation');
    return null;
  }

  try {
    // Prepare data for AI analysis (now async to load patterns)
    const analysisData = await prepareAnalysisData(memoryNodes, period);

    // Generate insights using AI
    const aiResponse = await callInsightsAI(analysisData);

    if (!aiResponse) {
      return null;
    }

    // Parse and structure the response
    const report = parseAIResponse(aiResponse, memoryNodes, period);

    return report;
  } catch (error) {
    console.error('Error generating insights:', error);
    return null;
  }
}

interface AnalysisData {
  period: InsightPeriod;
  periodLabel: string;
  sessionCount: number;
  sessions: {
    id: string;
    date: string;
    dateISO: string;
    summary: string;
    topics: string[];
    emotions: string[];
    events: string[];
    people: string[];
    thoughts: string[];
    unresolvedQuestions: string[];
  }[];
  patterns: {
    type: string;
    description: string;
    subject?: string;
    sessionCount: number;
    confidence: number;
  }[];
}

async function prepareAnalysisData(memoryNodes: MemoryNode[], period: InsightPeriod): Promise<AnalysisData> {
  const periodLabels: Record<InsightPeriod, string> = {
    week: 'the past week',
    month: 'the past month',
    all_time: 'all time',
  };

  const sessions = memoryNodes.map((node) => ({
    id: node.sessionId,
    date: format(node.createdAt, 'MMM d, yyyy'),
    dateISO: node.createdAt.toISOString().split('T')[0],
    summary: node.summary,
    topics: node.topics,
    emotions: node.emotions,
    events: node.events,
    people: node.peopleMentioned,
    thoughts: node.thoughts,
    unresolvedQuestions: node.unresolvedQuestions,
  }));

  // Load confirmed patterns for deeper analysis
  let patterns: AnalysisData['patterns'] = [];
  try {
    const confirmedPatterns = await getConfirmedPatterns();
    patterns = confirmedPatterns.map((p) => ({
      type: p.patternType,
      description: p.description,
      subject: p.subject,
      sessionCount: p.relatedSessions.length,
      confidence: p.confidence,
    }));
  } catch (error) {
    console.warn('Failed to load patterns for insights:', error);
  }

  return {
    period,
    periodLabel: periodLabels[period],
    sessionCount: memoryNodes.length,
    sessions,
    patterns,
  };
}

// Helper functions
function inferProviderFromModelName(model?: string): ModelProvider {
  const normalized = (model || '').toLowerCase();
  if (normalized.includes('gemini')) return 'gemini';
  if (normalized.includes('gpt') || normalized.includes('openai') || normalized.includes('o1') || normalized.includes('5'))
    return 'openai';
  return 'xai';
}

function resolveInsightsModelPreference(): { provider: ModelProvider; model: string } {
  const provider = INSIGHTS_MODEL_PROVIDER || inferProviderFromModelName(INSIGHTS_MODEL);
  const model =
    INSIGHTS_MODEL ||
    (provider === 'openai'
      ? DEFAULT_MODELS.openai
      : provider === 'gemini'
      ? DEFAULT_MODELS.gemini
      : DEFAULT_MODELS.xai);

  return { provider, model };
}

async function callInsightsAI(data: AnalysisData): Promise<string | null> {
  const prompt = buildInsightsPrompt(data);
  const modelPref = resolveInsightsModelPreference();

  try {
    if (modelPref.provider === 'openai' && OPENAI_API_KEY) {
      return await callOpenAI(prompt, modelPref.model);
    }

    if (modelPref.provider === 'gemini' && GEMINI_API_KEY) {
      return await callGemini(prompt, modelPref.model);
    }

    // Default to xAI (Grok)
    if (XAI_API_KEY) {
      return await callXAI(prompt, modelPref.provider === 'xai' ? modelPref.model : DEFAULT_MODELS.xai);
    }

    console.error('No API key available for insights');
    return null;
  } catch (error) {
    console.error('Error calling insights AI:', error);

    // Fallback to Grok if primary fails
    if (modelPref.provider !== 'xai' && XAI_API_KEY) {
      try {
        console.log('Falling back to Grok for insights');
        return await callXAI(prompt, DEFAULT_MODELS.xai);
      } catch (fallbackError) {
        console.error('Grok fallback failed:', fallbackError);
      }
    }

    return null;
  }
}

async function callGemini(prompt: string, model: string): Promise<string | null> {
  const { controller, timeoutId } = createTimeoutController(10000); // 60s timeout for insights

  try {
    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
            topP: 0.9,
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAI(prompt: string, model: string): Promise<string | null> {
  const { controller, timeoutId } = createTimeoutController(10000); // 60s timeout for insights

  try {
    const response = await fetchWithRetry(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a careful, structured analyst. Return only the requested JSON output.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callXAI(prompt: string, model: string): Promise<string | null> {
  const { controller, timeoutId } = createTimeoutController(10000); // 60s timeout for insights

  try {
    const response = await fetchWithRetry(`${XAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a careful, structured analyst. Return only the requested JSON output.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildInsightsPrompt(data: AnalysisData): string {
  // Format all sessions with their raw data, including session IDs for evidence linking
  const sessionsText = data.sessions
    .map(
      (s) => `
[${s.date}] (Session ID: ${s.id})
Summary: ${s.summary}
Topics: ${s.topics.join(', ') || 'none'}
Emotions: ${s.emotions.join(', ') || 'none'}
People mentioned: ${s.people.join(', ') || 'none'}
Events: ${s.events.join('; ') || 'none'}
Thoughts: ${s.thoughts.join('; ') || 'none'}
Unresolved questions: ${s.unresolvedQuestions.join('; ') || 'none'}`
    )
    .join('\n');

  // Format existing patterns if any
  const patternsText = data.patterns.length > 0
    ? `\nEXISTING DETECTED PATTERNS:\n${data.patterns.map((p) =>
        `- [${p.type}] ${p.subject ? `${p.subject}: ` : ''}${p.description} (${p.sessionCount} sessions, ${Math.round(p.confidence * 100)}% confidence)`
      ).join('\n')}`
    : '';

  return `You are analyzing someone's voice journal to find NON-OBVIOUS insights - the kind of observations a person wouldn't notice about themselves.

JOURNAL SESSIONS FROM ${data.periodLabel.toUpperCase()} (${data.sessionCount} sessions):
${sessionsText}
${patternsText}

---

YOUR TASK: Find insights that will make the user think "I didn't realize that!" Focus on:

1. **NON-OBVIOUS CONNECTIONS** (type: "connection")
   - Correlations they wouldn't notice: "You feel most anxious on Sunday evenings thinking about the work week"
   - Hidden triggers: "Every time you mention your girlfriend, you also seem stressed about school - are they connected?"
   - Temporal patterns: times of day/week when certain emotions appear
   - Co-occurrences: topics/people that always appear together

2. **BLIND SPOTS** (type: "blind_spot")
   - Things mentioned repeatedly WITHOUT action: "You've mentioned feeling disconnected from friends 4 times but haven't talked about reaching out"
   - Avoided topics: things mentioned once then dropped, or topics that seem important but rarely explored
   - Unresolved questions that keep coming up without progress

3. **GROWTH & CHANGE** (type: "growth")
   - Topics that have RESOLVED or faded (positive growth)
   - Emotional shifts: "You were anxious about X for weeks, now you seem settled"
   - New concerns emerging
   - Include BEFORE and AFTER comparison

4. **TRENDS WITH EVIDENCE** (type: "trend")
   - NOT just "you were stressed this week" but "your stress about work has been building over the past month"
   - Include SPECIFIC quotes from sessions as evidence
   - Link to the actual sessions that show this

5. **PATTERNS & REFLECTIONS** (type: "pattern" or "reflection")
   - Only when genuinely interesting observations

---

CRITICAL REQUIREMENTS:
- Include DIRECT QUOTES from the sessions as evidence (use the actual words from summaries/thoughts)
- Reference SPECIFIC session IDs for each insight
- For connections, specify WHAT is correlated with WHAT
- For growth, include BEFORE state and AFTER state
- Sound like a caring friend, not an analyst
- Quality over quantity: 4-6 deep insights beats 10 shallow ones

---

OUTPUT FORMAT (return ONLY this JSON):
{
  "insights": [
    {
      "type": "connection|blind_spot|growth|trend|pattern|reflection",
      "title": "Short headline (5-10 words)",
      "narrative": "2-4 sentences explaining this insight like a friend would. Be specific, not generic.",
      "priority": "high|medium|low",
      "evidence": [
        {
          "sessionId": "actual session ID from above",
          "sessionDate": "YYYY-MM-DD",
          "quote": "Direct quote or paraphrase from that session",
          "context": "Brief context (optional)"
        }
      ],
      "connection": {
        "items": ["item1", "item2"],
        "correlationType": "co_occurrence|trigger|temporal|contrast",
        "strength": "strong|moderate|emerging"
      },
      "growthIndicator": {
        "topic": "what changed",
        "before": "how it was before",
        "after": "how it is now",
        "direction": "improving|declining|resolved|new",
        "timespan": "over what period"
      }
    }
  ],
  "emotionalSummary": {
    "dominantEmotions": ["top 3 emotions"],
    "trend": "improving|stable|declining|mixed",
    "trendNarrative": "Brief observation about emotional trajectory"
  },
  "topicSummary": {
    "recurringTopics": ["themes mentioned 2+ times"],
    "emergingTopics": ["new themes appearing recently"],
    "resolvedTopics": ["themes that seem settled or dropped"]
  },
  "growthSnapshot": {
    "resolved": ["concerns that have faded or been addressed"],
    "improving": ["areas showing positive change"],
    "newConcerns": ["recently emerged worries or focus areas"],
    "stagnant": ["things mentioned repeatedly without progress"]
  }
}

NOTES:
- "connection" and "growthIndicator" fields are OPTIONAL - only include when relevant to that insight type
- For "connection" type insights, the "connection" field is REQUIRED
- For "growth" type insights, the "growthIndicator" field is REQUIRED
- Include "evidence" array for ALL insight types with at least 1-2 supporting quotes
- Be specific about session dates and IDs - don't guess or make them up`;
}

interface AIEvidenceResponse {
  sessionId: string;
  sessionDate: string;
  quote: string;
  context?: string;
}

interface AIConnectionResponse {
  items: string[];
  correlationType: 'co_occurrence' | 'trigger' | 'temporal' | 'contrast';
  strength: 'strong' | 'moderate' | 'emerging';
}

interface AIGrowthIndicatorResponse {
  topic: string;
  before: string;
  after: string;
  direction: 'improving' | 'declining' | 'resolved' | 'new';
  timespan: string;
}

interface AIInsightResponse {
  insights: {
    type: InsightType;
    title: string;
    narrative: string;
    priority: InsightPriority;
    sessionDates?: string[]; // Legacy field for backwards compatibility
    evidence?: AIEvidenceResponse[];
    connection?: AIConnectionResponse;
    growthIndicator?: AIGrowthIndicatorResponse;
  }[];
  emotionalSummary: {
    dominantEmotions: string[];
    trend: EmotionTrend;
    trendNarrative: string;
  };
  topicSummary: {
    recurringTopics: string[];
    emergingTopics: string[];
    resolvedTopics: string[];
  };
  growthSnapshot?: {
    resolved: string[];
    improving: string[];
    newConcerns: string[];
    stagnant: string[];
  };
}

function parseAIResponse(
  response: string,
  memoryNodes: MemoryNode[],
  period: InsightPeriod
): InsightsReport | null {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }

    const parsed: AIInsightResponse = JSON.parse(jsonMatch[0]);
    const now = new Date();

    // Build a map of session IDs to memory nodes for validation
    const sessionIdToNode = new Map<string, MemoryNode>();
    memoryNodes.forEach((node) => sessionIdToNode.set(node.sessionId, node));

    // Convert AI response to InsightsReport
    const insights: Insight[] = (parsed.insights || []).map((insight) => {
      // Process evidence - validate session IDs and convert dates
      const evidence: InsightEvidence[] = (insight.evidence || [])
        .filter((e) => e.sessionId && sessionIdToNode.has(e.sessionId))
        .map((e) => {
          const node = sessionIdToNode.get(e.sessionId);
          return {
            sessionId: e.sessionId,
            sessionDate: node?.createdAt || new Date(e.sessionDate || now),
            quote: e.quote || '',
            context: e.context,
          };
        });

      // Get session IDs from evidence, or fall back to legacy sessionDates field
      const sessionsReferenced = evidence.length > 0
        ? evidence.map((e) => e.sessionId)
        : findReferencedSessionIds(insight.sessionDates || [], memoryNodes);

      // Process connection if present
      let connection: InsightConnection | undefined;
      if (insight.connection && insight.connection.items?.length >= 2) {
        connection = {
          items: insight.connection.items,
          correlationType: insight.connection.correlationType || 'co_occurrence',
          strength: insight.connection.strength || 'moderate',
        };
      }

      // Process growth indicator if present
      let growthIndicator: GrowthIndicator | undefined;
      if (insight.growthIndicator && insight.growthIndicator.topic) {
        growthIndicator = {
          topic: insight.growthIndicator.topic,
          before: insight.growthIndicator.before || '',
          after: insight.growthIndicator.after || '',
          direction: insight.growthIndicator.direction || 'improving',
          timespan: insight.growthIndicator.timespan || getPeriodLabel(period),
        };
      }

      return {
        id: uuid(),
        type: insight.type || 'reflection',
        title: insight.title || 'Observation',
        narrative: insight.narrative || '',
        supportingData: {
          sessionsReferenced,
          timePeriod: getPeriodLabel(period),
          metrics: {},
        },
        priority: insight.priority || 'medium',
        generatedAt: now,
        expiresAt: getExpirationDate(period, now),
        period,
        // Enhanced fields
        evidence: evidence.length > 0 ? evidence : undefined,
        connection,
        growthIndicator,
      };
    });

    // Build emotion counts from memory nodes
    const emotionCounts: Record<string, number> = {};
    memoryNodes.forEach((node) => {
      node.emotions.forEach((emotion) => {
        const normalized = emotion.toLowerCase();
        emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
      });
    });

    const emotionalSummary: EmotionalSummary = {
      dominantEmotions: parsed.emotionalSummary?.dominantEmotions || [],
      emotionCounts,
      trend: parsed.emotionalSummary?.trend || 'stable',
      trendNarrative: parsed.emotionalSummary?.trendNarrative || '',
    };

    const topicSummary: TopicSummary = {
      recurringTopics: parsed.topicSummary?.recurringTopics || [],
      emergingTopics: parsed.topicSummary?.emergingTopics || [],
      resolvedTopics: parsed.topicSummary?.resolvedTopics || [],
    };

    return {
      id: uuid(),
      generatedAt: now,
      period,
      sessionCount: memoryNodes.length,
      insights,
      emotionalSummary,
      topicSummary,
      // Include growth snapshot if provided
      growthSnapshot: parsed.growthSnapshot,
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function findReferencedSessionIds(dates: string[], memoryNodes: MemoryNode[]): string[] {
  if (!dates || dates.length === 0) {
    return memoryNodes.slice(0, 3).map((n) => n.sessionId);
  }

  // Try to match dates to session IDs
  const matchedIds: string[] = [];
  for (const dateStr of dates) {
    const node = memoryNodes.find((n) => format(n.createdAt, 'MMM d') === dateStr);
    if (node) {
      matchedIds.push(node.sessionId);
    }
  }

  return matchedIds.length > 0 ? matchedIds : memoryNodes.slice(0, 3).map((n) => n.sessionId);
}

function getPeriodLabel(period: InsightPeriod): string {
  switch (period) {
    case 'week':
      return 'Past week';
    case 'month':
      return 'Past month';
    case 'all_time':
      return 'All time';
  }
}

function getExpirationDate(period: InsightPeriod, generatedAt: Date): Date {
  const hours = CACHE_FRESHNESS[period];
  return new Date(generatedAt.getTime() + hours * 60 * 60 * 1000);
}
