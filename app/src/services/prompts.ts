/**
 * Prompts Service
 *
 * Generates and manages AI-powered journaling prompts based on user patterns.
 * Prompts are specific to the user based on their patterns - the AI is essentially
 * saying "I noticed something interesting - want to talk about it?"
 */

import { v4 as uuid } from 'uuid';
import { Prompt, Pattern, JournalSession, MemoryNode } from '../types';
import * as db from './database';
import { getConfirmedPatterns } from './patterns';
import { fetchWithRetry, createTimeoutController } from './api-utils';

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const XAI_API_URL = 'https://api.x.ai/v1';

// Prompt generation model preference
const PROMPT_MODEL_PROVIDER = process.env.EXPO_PUBLIC_PROMPT_MODEL_PROVIDER || 'xai';
const PROMPT_MODEL = process.env.EXPO_PUBLIC_PROMPT_MODEL || 'grok-4-1-fast-non-reasoning';

// Constants
const MIN_SESSIONS_FOR_PROMPTS = 3;
const PROMPT_EXPIRY_DAYS = 14;
const SESSIONS_LOOKBACK_DAYS = 90; // 3 months

// =============================================================================
// LLM Integration
// =============================================================================

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function runPromptGeneration(prompt: string): Promise<string> {
  const { controller, timeoutId } = createTimeoutController(60000);

  try {
    if (PROMPT_MODEL_PROVIDER === 'xai' && XAI_API_KEY) {
      return await generateWithXAI(prompt, controller.signal);
    }
    if (GEMINI_API_KEY) {
      return await generateWithGemini(prompt, controller.signal);
    }
    throw new Error('No API key available for prompt generation');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateWithGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const model = PROMPT_MODEL_PROVIDER === 'gemini' ? PROMPT_MODEL : 'gemini-2.0-flash';

  const response = await fetchWithRetry(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          topP: 0.9,
        },
      }),
      signal,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function generateWithXAI(prompt: string, signal?: AbortSignal): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a thoughtful friend helping generate journaling prompts. Return only the requested JSON output.' },
    { role: 'user', content: prompt },
  ];

  const response = await fetchWithRetry(`${XAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: PROMPT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || '';
}

// =============================================================================
// Prompt Generation
// =============================================================================

interface GeneratedPrompt {
  question: string;
  related_sessions: string[];
  source_pattern_id?: string;
}

function buildPromptGenerationPrompt(
  sessions: { session: JournalSession; memory: MemoryNode | null }[],
  patterns: Pattern[],
  existingPrompts: Prompt[],
  personalFacts: string,
  count: number
): string {
  // Format sessions
  const sessionsText = sessions
    .slice(0, 20) // Limit to 20 most recent
    .map(({ session, memory }) => {
      const date = session.startedAt.toISOString().split('T')[0];
      if (!memory) return `[${date}] Session ${session.id}: (No summary)`;
      return `[${date}] Session ${session.id}:
Summary: ${memory.summary}
Emotions: ${memory.emotions.join(', ') || 'None'}
Topics: ${memory.topics.join(', ') || 'None'}
Thoughts: ${memory.thoughts.join('; ') || 'None'}`;
    })
    .join('\n\n');

  // Format patterns
  const patternsText = patterns.length === 0
    ? '(No confirmed patterns yet)'
    : patterns
        .map((p) => `[Pattern ${p.id}] ${p.patternType}: ${p.description}${p.subject ? ` (Subject: ${p.subject})` : ''}`)
        .join('\n');

  // Format existing prompts
  const existingText = existingPrompts.length === 0
    ? '(No existing prompts)'
    : existingPrompts.map((p) => `- ${p.question} (${p.status})`).join('\n');

  return `You are generating journaling prompts for a voice journaling app named Alma. The user talks to Alma (an AI friend) to process their thoughts, and you're helping identify questions worth exploring based on their patterns.

THE USER:
${personalFacts || '(No personal facts yet)'}

RECENT SESSIONS (past 3 months):
${sessionsText}

PATTERNS DETECTED:
${patternsText}

EXISTING PROMPTS (avoid duplicates):
${existingText}

---

Generate ${count} journaling prompts. Each prompt should:

1. BE SPECIFIC - Reference actual patterns from their history
2. FILL A GAP - Ask about something they haven't fully explored
3. SOUND LIKE A FRIEND - Warm, curious, conversational
4. BE EXPLORABLE - Something they can actually talk through

GOOD PROMPTS:
- "You've mentioned feeling stuck at work a few times. What do you think is really going on there?"
- "I noticed you talk about Sarah differently lately - more logistics, less connection. How are things between you two?"
- "You keep bringing up wanting to be more social. What do you think is actually stopping you?"
- "Work stress comes up almost every week, but you haven't talked about whether you actually like your job. Do you?"

BAD PROMPTS (don't generate these):
- "How are you feeling today?" (too generic)
- "What are your goals for this month?" (not pattern-based)
- "You said X on Monday but Y on Friday" (gotcha/judgmental)
- "Tell me about your childhood" (too broad)
- "Reflect on your personal growth journey" (too formal/therapeutic)

---

OUTPUT FORMAT:

Return a JSON array (and ONLY the JSON, no other text):
[
  {
    "question": "The actual prompt question, 1-3 sentences, conversational",
    "related_sessions": ["session_id_1", "session_id_2"],
    "source_pattern_id": "optional pattern ID if directly from a pattern"
  }
]

Be selective. Only generate prompts that feel genuinely worth exploring. If you can't find ${count} good ones, return fewer. Quality over quantity.`;
}

function parsePromptResponse(text: string): GeneratedPrompt[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const result = JSON.parse(jsonStr);

    if (!Array.isArray(result)) return [];

    return result.filter(
      (item: any) =>
        typeof item.question === 'string' &&
        item.question.length > 10 &&
        Array.isArray(item.related_sessions)
    );
  } catch (error) {
    console.error('Failed to parse prompt response:', error);
    return [];
  }
}

/**
 * Validate generated prompts before saving
 */
function validatePrompts(
  candidates: GeneratedPrompt[],
  existingPrompts: Prompt[],
  validSessionIds: Set<string>
): GeneratedPrompt[] {
  const existingQuestions = new Set(
    existingPrompts.map((p) => p.question.toLowerCase().trim())
  );

  return candidates.filter((candidate) => {
    // Not a duplicate
    if (existingQuestions.has(candidate.question.toLowerCase().trim())) {
      console.log('Filtered: duplicate question');
      return false;
    }

    // Has substance (not too short)
    if (candidate.question.length < 20) {
      console.log('Filtered: too short');
      return false;
    }

    // Not too long
    if (candidate.question.length > 300) {
      console.log('Filtered: too long');
      return false;
    }

    // References valid sessions
    const validSessions = candidate.related_sessions.filter((id) =>
      validSessionIds.has(id)
    );
    if (validSessions.length < 1) {
      console.log('Filtered: no valid sessions');
      return false;
    }

    // Update to only include valid sessions
    candidate.related_sessions = validSessions;

    return true;
  });
}

/**
 * Generate new journaling prompts
 */
export async function generatePrompts(count: number = 5): Promise<Prompt[]> {
  console.log(`Generating ${count} prompts...`);

  try {
    // 1. Check session count
    const sessionCount = await db.getSessionCount();
    if (sessionCount < MIN_SESSIONS_FOR_PROMPTS) {
      console.log(`Not enough sessions (${sessionCount}/${MIN_SESSIONS_FOR_PROMPTS})`);
      return [];
    }

    // 2. Load context
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - SESSIONS_LOOKBACK_DAYS);
    const recentSessions = await db.getSessionsInDateRange(lookbackDate, new Date());

    // Build session+memory pairs
    const sessionsWithMemory: { session: JournalSession; memory: MemoryNode | null }[] = [];
    const validSessionIds = new Set<string>();
    for (const session of recentSessions) {
      const memory = await db.getMemoryNodeForSession(session.id);
      sessionsWithMemory.push({ session, memory });
      validSessionIds.add(session.id);
    }

    // 3. Load confirmed patterns only (confidence >= 0.5, active status)
    const patterns = await getConfirmedPatterns();

    // 4. Load existing prompts to avoid duplicates
    const existingPrompts = await db.getAllPrompts();

    // 5. Load personal knowledge
    const personalFacts = await db.getPersonalKnowledge();

    // 6. Build and run prompt
    const prompt = buildPromptGenerationPrompt(
      sessionsWithMemory,
      patterns,
      existingPrompts,
      personalFacts,
      count
    );

    const response = await runPromptGeneration(prompt);

    // 7. Parse response
    const candidates = parsePromptResponse(response);
    console.log(`Parsed ${candidates.length} candidate prompts`);

    // 8. Validate
    const validated = validatePrompts(candidates, existingPrompts, validSessionIds);
    console.log(`Validated ${validated.length} prompts`);

    // 9. Create and save prompts
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + PROMPT_EXPIRY_DAYS);

    const newPrompts: Prompt[] = [];
    for (const candidate of validated) {
      const prompt: Prompt = {
        id: uuid(),
        question: candidate.question,
        sourcePatternId: candidate.source_pattern_id,
        relatedSessions: candidate.related_sessions,
        status: 'active',
        createdAt: now,
        expiresAt,
      };
      await db.createPrompt(prompt);
      newPrompts.push(prompt);
    }

    console.log(`Created ${newPrompts.length} new prompts`);
    return newPrompts;
  } catch (error) {
    console.error('Prompt generation error:', error);
    return [];
  }
}

// =============================================================================
// Prompt Lifecycle
// =============================================================================

/**
 * Mark a prompt as explored and link to the session
 */
export async function markPromptExplored(
  promptId: string,
  sessionId: string
): Promise<void> {
  await db.updatePrompt(promptId, {
    status: 'explored',
    exploredSessionId: sessionId,
  });
}

/**
 * Dismiss a prompt
 */
export async function dismissPrompt(promptId: string): Promise<void> {
  await db.updatePrompt(promptId, {
    status: 'dismissed',
  });
}

/**
 * Clean up expired and old prompts
 */
export async function cleanupPrompts(): Promise<void> {
  // Mark expired prompts
  const expiredCount = await db.markExpiredPrompts();
  if (expiredCount > 0) {
    console.log(`Marked ${expiredCount} prompts as expired`);
  }

  // Delete old prompts (> 30 days)
  const deletedCount = await db.deleteOldPrompts(30);
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} old prompts`);
  }
}

/**
 * Get the count of sessions needed before prompts are available
 */
export async function getSessionsNeededForPrompts(): Promise<number> {
  const sessionCount = await db.getSessionCount();
  return Math.max(0, MIN_SESSIONS_FOR_PROMPTS - sessionCount);
}

/**
 * Check if user has enough sessions for prompts
 */
export async function hasEnoughSessionsForPrompts(): Promise<boolean> {
  const sessionCount = await db.getSessionCount();
  return sessionCount >= MIN_SESSIONS_FOR_PROMPTS;
}

// =============================================================================
// Session Integration
// =============================================================================

/**
 * Build an opening message for a session started from a prompt
 */
export function buildPromptSessionOpener(prompt: Prompt): string {
  // Don't read the prompt verbatim - make it natural
  const questionLower = prompt.question.toLowerCase().replace(/\?$/, '');

  const openers = [
    `So, ${questionLower}. What's been on your mind about that?`,
    `You wanted to explore something. ${prompt.question}`,
    `I've been curious about this too. ${prompt.question}`,
  ];

  return openers[Math.floor(Math.random() * openers.length)];
}

/**
 * Get active prompts for display
 */
export async function getActivePrompts(): Promise<Prompt[]> {
  // First clean up any expired ones
  await cleanupPrompts();

  return db.getActivePrompts();
}
