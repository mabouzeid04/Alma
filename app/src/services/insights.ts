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
} from '../types';
import * as database from './database';
import { subDays, subMonths, format } from 'date-fns';
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
    // Prepare data for AI analysis
    const analysisData = prepareAnalysisData(memoryNodes, period);

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
    date: string;
    summary: string;
    topics: string[];
    emotions: string[];
    events: string[];
    people: string[];
    thoughts: string[];
    unresolvedQuestions: string[];
  }[];
}

function prepareAnalysisData(memoryNodes: MemoryNode[], period: InsightPeriod): AnalysisData {
  const periodLabels: Record<InsightPeriod, string> = {
    week: 'the past week',
    month: 'the past month',
    all_time: 'all time',
  };

  const sessions = memoryNodes.map((node) => ({
    date: format(node.createdAt, 'MMM d, yyyy'),
    summary: node.summary,
    topics: node.topics,
    emotions: node.emotions,
    events: node.events,
    people: node.peopleMentioned,
    thoughts: node.thoughts,
    unresolvedQuestions: node.unresolvedQuestions,
  }));

  return {
    period,
    periodLabel: periodLabels[period],
    sessionCount: memoryNodes.length,
    sessions,
  };
}

// Helper functions
function inferProviderFromModelName(model?: string): ModelProvider {
  const normalized = (model || '').toLowerCase();
  if (normalized.includes('grok') || normalized.includes('xai')) return 'xai';
  if (normalized.includes('gpt') || normalized.includes('openai') || normalized.includes('o1') || normalized.includes('5'))
    return 'openai';
  return 'gemini';
}

function resolveInsightsModelPreference(): { provider: ModelProvider; model: string } {
  const provider = INSIGHTS_MODEL_PROVIDER || inferProviderFromModelName(INSIGHTS_MODEL);
  const model =
    INSIGHTS_MODEL ||
    (provider === 'openai'
      ? DEFAULT_MODELS.openai
      : provider === 'xai'
      ? DEFAULT_MODELS.xai
      : DEFAULT_MODELS.gemini);

  return { provider, model };
}

async function callInsightsAI(data: AnalysisData): Promise<string | null> {
  const prompt = buildInsightsPrompt(data);
  const modelPref = resolveInsightsModelPreference();

  try {
    if (modelPref.provider === 'openai' && OPENAI_API_KEY) {
      return await callOpenAI(prompt, modelPref.model);
    }

    if (modelPref.provider === 'xai' && XAI_API_KEY) {
      return await callXAI(prompt, modelPref.model);
    }

    // Default to Gemini
    if (GEMINI_API_KEY) {
      return await callGemini(prompt, modelPref.provider === 'gemini' ? modelPref.model : DEFAULT_MODELS.gemini);
    }

    console.error('No API key available for insights');
    return null;
  } catch (error) {
    console.error('Error calling insights AI:', error);

    // Fallback to Gemini if primary fails
    if (modelPref.provider !== 'gemini' && GEMINI_API_KEY) {
      try {
        console.log('Falling back to Gemini for insights');
        return await callGemini(prompt, DEFAULT_MODELS.gemini);
      } catch (fallbackError) {
        console.error('Gemini fallback failed:', fallbackError);
      }
    }

    return null;
  }
}

async function callGemini(prompt: string, model: string): Promise<string | null> {
  const { controller, timeoutId } = createTimeoutController();

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
  const { controller, timeoutId } = createTimeoutController();

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
  const { controller, timeoutId } = createTimeoutController();

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
  // Format all sessions with their raw data
  const sessionsText = data.sessions
    .map(
      (s) => `
[${s.date}]
Summary: ${s.summary}
Topics: ${s.topics.join(', ') || 'none'}
Emotions: ${s.emotions.join(', ') || 'none'}
People mentioned: ${s.people.join(', ') || 'none'}
Events: ${s.events.join('; ') || 'none'}
Thoughts: ${s.thoughts.join('; ') || 'none'}
Unresolved questions: ${s.unresolvedQuestions.join('; ') || 'none'}`
    )
    .join('\n');

  return `You are a thoughtful friend helping someone understand patterns in their voice journal over ${data.periodLabel}.

Here are all ${data.sessionCount} journal sessions from this period. Read through them and identify meaningful patterns, trends, and insights.

${sessionsText}

Based on these sessions, generate insights that sound like observations from a caring friend, NOT analytical reports. Focus on:
- Emotional patterns (getting better/worse/staying the same?)
- Recurring themes and topics
- Growth and progress
- Relationships and how people show up
- Lingering questions or unresolved threads
- Notice similar emotions/topics even if worded differently (e.g., "anxious" and "anxiety", "work" and "job")

Return a JSON object with this structure:
{
  "insights": [
    {
      "type": "trend|pattern|growth|suggestion|reflection",
      "title": "Friendly headline (5-8 words)",
      "narrative": "2-3 sentences like a friend noticing something",
      "priority": "high|medium|low",
      "sessionDates": ["dates of relevant sessions"]
    }
  ],
  "emotionalSummary": {
    "dominantEmotions": ["top 3 emotions you noticed"],
    "trend": "improving|stable|declining|mixed",
    "trendNarrative": "Brief observation about emotional patterns"
  },
  "topicSummary": {
    "recurringTopics": ["themes mentioned multiple times"],
    "emergingTopics": ["newer themes that appeared recently"],
    "resolvedTopics": ["themes that seem resolved or dropped"]
  }
}

Generate 3-5 insights. Return only valid JSON.`;
}

interface AIInsightResponse {
  insights: {
    type: InsightType;
    title: string;
    narrative: string;
    priority: InsightPriority;
    sessionDates: string[];
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

    // Convert AI response to InsightsReport
    const insights: Insight[] = (parsed.insights || []).map((insight, index) => ({
      id: uuid(),
      type: insight.type || 'reflection',
      title: insight.title || 'Observation',
      narrative: insight.narrative || '',
      supportingData: {
        sessionsReferenced: findReferencedSessionIds(insight.sessionDates, memoryNodes),
        timePeriod: getPeriodLabel(period),
        metrics: {},
      },
      priority: insight.priority || 'medium',
      generatedAt: now,
      expiresAt: getExpirationDate(period, now),
      period,
    }));

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
