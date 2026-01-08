/**
 * Theories Service - Long-term Understanding
 *
 * Manages "working theories" - hypotheses about the user's beliefs, values,
 * and behavioral patterns that develop over months of journaling.
 *
 * Philosophy: Theories are NOT facts, they're interpretations being tested.
 * - Higher thresholds than patterns (10+ sessions, 8+ weeks)
 * - Auto-decay if repeatedly contradicted
 * - Background understanding, not prominently displayed
 */

import { v4 as uuid } from 'uuid';
import { Theory, TheoryCategory, TheoryStatus, TheoryEvidence, Pattern, MemoryNode, JournalSession } from '../types';
import * as db from './database';
import { fetchWithRetry, createTimeoutController } from './api-utils';

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const XAI_API_URL = 'https://api.x.ai/v1';

// Theory model preference (use analytical model)
const THEORY_MODEL_PROVIDER = process.env.EXPO_PUBLIC_THEORY_MODEL_PROVIDER || 'xai';
const THEORY_MODEL = process.env.EXPO_PUBLIC_THEORY_MODEL || 'grok-4-1-fast-non-reasoning';

// Thresholds - HIGHER than patterns
const MIN_SESSIONS_FOR_CONFIDENT = 10;
const MIN_WEEKS_FOR_CONFIDENT = 8;
const MIN_PATTERNS_FOR_THEORY = 3; // Need multiple patterns to form a theory
const CONTRADICTION_DECAY_RATE = 0.15; // How much confidence drops per contradiction
const QUESTIONING_THRESHOLD = 0.4; // Below this, theory enters questioning state

// =============================================================================
// LLM Integration
// =============================================================================

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function runTheoryPrompt(prompt: string): Promise<string> {
  const { controller, timeoutId } = createTimeoutController(90000); // 90s for theory analysis

  try {
    if (THEORY_MODEL_PROVIDER === 'xai' && XAI_API_KEY) {
      return await generateWithXAI(prompt, controller.signal);
    }
    if (GEMINI_API_KEY) {
      return await generateWithGemini(prompt, controller.signal);
    }
    throw new Error('No API key available for theory detection');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateWithGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const model = THEORY_MODEL_PROVIDER === 'gemini' ? THEORY_MODEL : 'gemini-2.0-flash';

  const response = await fetchWithRetry(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4, // Lower temperature for more analytical responses
          maxOutputTokens: 4000,
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
    {
      role: 'system',
      content: 'You are a thoughtful psychologist helping understand someone through their journal entries. Your theories should be insightful but humble - they are working hypotheses, not diagnoses. Return only the requested JSON output.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await fetchWithRetry(`${XAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: THEORY_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 4000,
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
// Theory Detection
// =============================================================================

interface TheoryDetectionResult {
  new_theories: {
    title: string;
    theory: string;
    category: TheoryCategory;
    supporting_patterns: string[];
    evidence_quotes: string[];
    initial_confidence: number;
  }[];
  updated_theories: {
    theory_id: string;
    new_evidence?: string;
    confidence_change: number;
    is_contradicting: boolean;
  }[];
}

function buildTheoryDetectionPrompt(
  patterns: Pattern[],
  existingTheories: Theory[],
  recentSessions: { session: JournalSession; memory: MemoryNode | null }[]
): string {
  // Format patterns
  const patternsText = patterns
    .filter((p) => p.status === 'active' && p.confidence >= 0.5)
    .map((p) => `
[Pattern: ${p.id}]
Type: ${p.patternType}
Subject: ${p.subject || 'General'}
Description: ${p.description}
Sessions: ${p.relatedSessions.length}
Confidence: ${(p.confidence * 100).toFixed(0)}%
Evidence: ${p.evidenceQuotes.slice(0, 3).join(' | ') || 'None'}
    `.trim())
    .join('\n\n');

  // Format existing theories
  const theoriesText = existingTheories.length === 0
    ? '(No existing theories)'
    : existingTheories.map((t) => `
[Theory: ${t.id}]
Title: ${t.title}
Category: ${t.category}
Status: ${t.status}
Confidence: ${(t.confidence * 100).toFixed(0)}%
Theory: ${t.theory}
Sessions: ${t.evidenceSessions.length}
    `.trim()).join('\n\n');

  // Format recent sessions for context
  const sessionsText = recentSessions.slice(0, 10).map(({ session, memory }) => {
    if (!memory) return `[${session.startedAt.toISOString().split('T')[0]}] (No summary)`;
    return `
[${session.startedAt.toISOString().split('T')[0]}] Session: ${session.id}
Summary: ${memory.summary}
Emotions: ${memory.emotions.join(', ')}
Topics: ${memory.topics.join(', ')}
Thoughts: ${memory.thoughts.slice(0, 2).join('; ')}
    `.trim();
  }).join('\n\n');

  return `You are forming WORKING THEORIES about someone based on their journal patterns.

A theory is NOT a fact - it's a hypothesis about WHY they behave certain ways.

PATTERNS DETECTED (confirmed over multiple sessions):
${patternsText || '(No patterns yet)'}

EXISTING THEORIES:
${theoriesText}

RECENT SESSION CONTEXT:
${sessionsText}

---

YOUR TASK:

1. **FORM NEW THEORIES** from patterns that suggest deeper understanding:
   - Look for patterns that connect to form a bigger picture
   - Focus on VALUES, BELIEFS, BEHAVIORS, RELATIONSHIPS, TRIGGERS
   - Theories should explain WHY, not just WHAT
   - Need at least 3 related patterns to form a theory
   - Examples:
     - "Values independence but seeks external validation - creates internal conflict"
     - "Avoids difficult conversations, processes emotions alone"
     - "High self-standards lead to impostor syndrome"
     - "Authority issues stem from need for autonomy"

2. **UPDATE EXISTING THEORIES** if new evidence supports or contradicts them

---

REQUIREMENTS:
- Theories need substantial evidence (we'll validate 10+ sessions, 8+ weeks)
- Be specific but humble - these are hypotheses, not diagnoses
- Don't create theories from single patterns
- Look for connections between patterns
- If you see contradiction to an existing theory, note it

---

OUTPUT FORMAT (return ONLY this JSON):
{
  "new_theories": [
    {
      "title": "Short descriptive title (3-6 words)",
      "theory": "Full narrative theory (2-4 sentences explaining the 'why')",
      "category": "values|behaviors|relationships|beliefs|triggers",
      "supporting_patterns": ["pattern_id_1", "pattern_id_2"],
      "evidence_quotes": ["supporting quote 1", "supporting quote 2"],
      "initial_confidence": 0.3
    }
  ],
  "updated_theories": [
    {
      "theory_id": "existing theory ID",
      "new_evidence": "What new evidence supports or contradicts this",
      "confidence_change": 0.05,
      "is_contradicting": false
    }
  ]
}

GUIDELINES:
- Only create theories you're genuinely confident about
- If no new theories are warranted, return empty array
- Confidence starts low (0.3-0.4) and builds over time
- Be thoughtful - these theories inform how the AI relates to this person`;
}

function parseTheoryResponse(text: string): TheoryDetectionResult | null {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const result = JSON.parse(jsonStr);

    return {
      new_theories: Array.isArray(result.new_theories) ? result.new_theories : [],
      updated_theories: Array.isArray(result.updated_theories) ? result.updated_theories : [],
    };
  } catch (error) {
    console.error('Failed to parse theory response:', error);
    return null;
  }
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Detect and update theories after pattern detection completes.
 * Called less frequently than pattern detection - only when there's enough data.
 */
export async function evaluateTheories(
  session: JournalSession,
  memoryNode: MemoryNode
): Promise<void> {
  console.log('🧠 Evaluating theories...');

  try {
    // Load context
    const patterns = await db.getActivePatterns();
    const existingTheories = await db.getAllTheories();

    // Only proceed if we have enough patterns
    if (patterns.length < MIN_PATTERNS_FOR_THEORY) {
      console.log(`📊 Not enough patterns for theory evaluation (${patterns.length}/${MIN_PATTERNS_FOR_THEORY})`);
      return;
    }

    // Load recent sessions for context
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentSessions = await db.getSessionsInDateRange(threeMonthsAgo, new Date());

    const sessionsWithMemory: { session: JournalSession; memory: MemoryNode | null }[] = [];
    for (const s of recentSessions) {
      const memory = await db.getMemoryNodeForSession(s.id);
      sessionsWithMemory.push({ session: s, memory });
    }

    // Build and run prompt
    const prompt = buildTheoryDetectionPrompt(patterns, existingTheories, sessionsWithMemory);
    const response = await runTheoryPrompt(prompt);

    // Parse response
    const result = parseTheoryResponse(response);
    if (!result) {
      console.log('⚠️ Failed to parse theory response');
      return;
    }

    const now = new Date();

    // 1. Create new theories
    for (const newTheory of result.new_theories) {
      // Validate we have supporting patterns
      const supportingPatterns = patterns.filter((p) =>
        newTheory.supporting_patterns.includes(p.id)
      );

      if (supportingPatterns.length < MIN_PATTERNS_FOR_THEORY) {
        console.log(`📋 Theory "${newTheory.title}" needs more supporting patterns`);
        continue;
      }

      // Check if we already have a similar theory
      const existingSimilar = await db.findTheoryByTitle(newTheory.title);
      if (existingSimilar) {
        console.log(`📋 Theory "${newTheory.title}" already exists, updating instead`);
        await updateTheoryWithEvidence(existingSimilar.id, session.id, newTheory.evidence_quotes[0], false);
        continue;
      }

      // Collect all evidence sessions from supporting patterns
      const allEvidenceSessions = new Set<string>();
      supportingPatterns.forEach((p) => p.relatedSessions.forEach((s) => allEvidenceSessions.add(s)));

      const theory: Theory = {
        id: uuid(),
        title: newTheory.title,
        theory: newTheory.theory,
        category: newTheory.category,
        confidence: newTheory.initial_confidence,
        status: 'developing',
        evidenceSessions: Array.from(allEvidenceSessions),
        evidence: newTheory.evidence_quotes.map((quote) => ({
          sessionId: session.id,
          quote,
          supportType: 'supporting' as const,
          addedAt: now,
        })),
        lastEvaluated: now,
        firstFormed: now,
        relatedPatterns: newTheory.supporting_patterns,
        createdAt: now,
        updatedAt: now,
      };

      await db.createTheory(theory);
      console.log(`✨ Created new theory: ${newTheory.title}`);
    }

    // 2. Update existing theories
    for (const update of result.updated_theories) {
      await updateTheoryWithEvidence(
        update.theory_id,
        session.id,
        update.new_evidence,
        update.is_contradicting,
        update.confidence_change
      );
    }

    // 3. Check if any developing theories should be promoted
    await promoteQualifiedTheories();

    console.log('🧠 Theory evaluation complete');
  } catch (error) {
    console.error('Theory evaluation error:', error);
    // Don't throw - theory evaluation failure shouldn't block session processing
  }
}

/**
 * Update a theory with new evidence
 */
async function updateTheoryWithEvidence(
  theoryId: string,
  sessionId: string,
  quote?: string,
  isContradicting = false,
  confidenceChange = 0.05
): Promise<void> {
  const theory = await db.getTheory(theoryId);
  if (!theory) return;

  const now = new Date();
  const newEvidence = [...theory.evidence];

  if (quote) {
    newEvidence.push({
      sessionId,
      quote,
      supportType: isContradicting ? 'contradicting' : 'supporting',
      addedAt: now,
    });
  }

  // Calculate new confidence
  let newConfidence = theory.confidence;
  if (isContradicting) {
    newConfidence = Math.max(0.1, theory.confidence - CONTRADICTION_DECAY_RATE);
  } else {
    newConfidence = Math.min(0.95, theory.confidence + confidenceChange);
  }

  // Determine new status
  let newStatus: TheoryStatus = theory.status;
  if (newConfidence < QUESTIONING_THRESHOLD && theory.status !== 'questioning') {
    newStatus = 'questioning';
  } else if (isContradicting && theory.status === 'confident') {
    // Even confident theories enter questioning if contradicted
    newStatus = 'questioning';
  }

  // Add session to evidence sessions if not already there
  const newEvidenceSessions = theory.evidenceSessions.includes(sessionId)
    ? theory.evidenceSessions
    : [...theory.evidenceSessions, sessionId];

  await db.updateTheory(theoryId, {
    evidence: newEvidence,
    evidenceSessions: newEvidenceSessions,
    confidence: newConfidence,
    status: newStatus,
    lastEvaluated: now,
    updatedAt: now,
    questioningReason: isContradicting ? quote : theory.questioningReason,
  });

  console.log(`📝 Updated theory: ${theory.title} (confidence: ${(newConfidence * 100).toFixed(0)}%, status: ${newStatus})`);
}

/**
 * Check if any developing theories should be promoted to confident
 */
async function promoteQualifiedTheories(): Promise<void> {
  const developingTheories = await db.getDevelopingTheories();

  for (const theory of developingTheories) {
    // Check session count
    if (theory.evidenceSessions.length < MIN_SESSIONS_FOR_CONFIDENT) continue;

    // Check time span
    const weeksSinceFirst = (Date.now() - theory.firstFormed.getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (weeksSinceFirst < MIN_WEEKS_FOR_CONFIDENT) continue;

    // Check confidence
    if (theory.confidence < 0.6) continue;

    // Promote to confident
    await db.updateTheory(theory.id, {
      status: 'confident',
      updatedAt: new Date(),
    });
    console.log(`🎉 Promoted theory to confident: ${theory.title}`);
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get theories relevant to current conversation context
 */
export async function getRelevantTheories(currentContext: string): Promise<Theory[]> {
  const allTheories = await db.getAllTheories();
  if (allTheories.length === 0) return [];

  // Only include confident and high-confidence developing theories
  const usableTheories = allTheories.filter(
    (t) => t.status === 'confident' || (t.status === 'developing' && t.confidence >= 0.5)
  );

  // Simple keyword matching for relevance
  const contextLower = currentContext.toLowerCase();
  const relevantTheories = usableTheories.filter((theory) => {
    const theoryText = `${theory.title} ${theory.theory} ${theory.category}`.toLowerCase();
    return (
      theoryText.split(' ').some((word) => word.length > 4 && contextLower.includes(word)) ||
      contextLower.split(' ').some((word) => word.length > 4 && theoryText.includes(word))
    );
  });

  // Return top relevant, or all confident theories if no specific match
  if (relevantTheories.length > 0) {
    return relevantTheories.slice(0, 3);
  }

  // Always include confident theories as background understanding
  return usableTheories.filter((t) => t.status === 'confident').slice(0, 2);
}

/**
 * Get all confident theories for display
 */
export async function getConfidentTheories(): Promise<Theory[]> {
  return db.getConfidentTheories();
}

/**
 * Get developing theories that might become confident soon
 */
export async function getEmergingTheories(): Promise<Theory[]> {
  const developing = await db.getDevelopingTheories();
  return developing.filter((t) => t.confidence >= 0.5);
}

/**
 * Get theories that need attention (questioning status)
 */
export async function getQuestioningTheories(): Promise<Theory[]> {
  return db.getQuestioningTheories();
}

/**
 * Check if we have enough data to start forming theories
 */
export async function canFormTheories(): Promise<boolean> {
  const patterns = await db.getActivePatterns();
  return patterns.length >= MIN_PATTERNS_FOR_THEORY;
}

/**
 * Format theories for AI context injection
 */
export function formatTheoriesForPrompt(theories: Theory[]): string {
  if (theories.length === 0) return '';

  const confidentTheories = theories.filter((t) => t.status === 'confident');
  const developingTheories = theories.filter((t) => t.status === 'developing');

  let text = '';

  if (confidentTheories.length > 0) {
    text += '\n## Working Theories (High Confidence)\n';
    text += 'These are patterns I\'ve observed over time. Use them to understand context, but don\'t mention them directly:\n\n';
    for (const t of confidentTheories) {
      text += `- **${t.title}** (${t.category}): ${t.theory}\n`;
    }
  }

  if (developingTheories.length > 0) {
    text += '\n## Developing Theories\n';
    text += 'These are patterns I\'m still learning about:\n\n';
    for (const t of developingTheories) {
      text += `- ${t.title}: ${t.theory}\n`;
    }
  }

  return text;
}
