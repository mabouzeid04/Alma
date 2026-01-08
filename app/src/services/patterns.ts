/**
 * Pattern Discovery Service
 *
 * Detects and tracks patterns across journal sessions:
 * - Emotional trends
 * - Opinion evolution
 * - Relationship dynamics
 * - Recurring unresolved questions
 *
 * Philosophy: Emergent LLM analysis over deterministic rules.
 * Give the LLM full context and ask "what patterns do you notice?"
 */

import { v4 as uuid } from 'uuid';
import { JournalSession, MemoryNode, Pattern, PatternType, PatternCounterEvidence } from '../types';
import * as db from './database';
import { fetchWithRetry, createTimeoutController } from './api-utils';

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const XAI_API_URL = 'https://api.x.ai/v1';

// Pattern detection model preference (use analytical model)
const PATTERN_MODEL_PROVIDER = process.env.EXPO_PUBLIC_PATTERN_MODEL_PROVIDER || 'xai';
const PATTERN_MODEL = process.env.EXPO_PUBLIC_PATTERN_MODEL || 'grok-4-1-fast-non-reasoning';

// Thresholds
const MIN_SESSIONS_FOR_ACTIVE = 6;
const MIN_WEEKS_FOR_ACTIVE = 4;
const MIN_QUOTES_FOR_ACTIVE = 3;

// =============================================================================
// LLM Integration
// =============================================================================

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function runPatternPrompt(prompt: string): Promise<string> {
  const { controller, timeoutId } = createTimeoutController(60000); // 60s for pattern analysis

  try {
    if (PATTERN_MODEL_PROVIDER === 'xai' && XAI_API_KEY) {
      return await generateWithXAI(prompt, controller.signal);
    }
    if (GEMINI_API_KEY) {
      return await generateWithGemini(prompt, controller.signal);
    }
    throw new Error('No API key available for pattern detection');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateWithGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const model = PATTERN_MODEL_PROVIDER === 'gemini' ? PATTERN_MODEL : 'gemini-2.0-flash';

  const response = await fetchWithRetry(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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
    { role: 'system', content: 'You are a careful pattern analyst. Return only the requested JSON output.' },
    { role: 'user', content: prompt },
  ];

  const response = await fetchWithRetry(`${XAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: PATTERN_MODEL,
      messages,
      temperature: 0.3,
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
// Similarity Checking
// =============================================================================

/**
 * Check if two subjects/topics are similar enough to be considered the same
 */
function areSubjectsSimilar(subject1: string | undefined, subject2: string | undefined): boolean {
  if (!subject1 || !subject2) return false;

  const s1 = subject1.toLowerCase().trim();
  const s2 = subject2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return true;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Tokenize and check word overlap
  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);

  // Check for significant word overlap (>50% of shorter list)
  const overlap = words1.filter(w => words2.some(w2 =>
    w === w2 || w.includes(w2) || w2.includes(w)
  ));
  const minWords = Math.min(words1.length, words2.length);
  if (minWords > 0 && overlap.length / minWords >= 0.5) return true;

  return false;
}

/**
 * Find an existing pattern that's similar to the given subject/description
 */
function findSimilarPattern(
  subject: string | undefined,
  description: string,
  patternType: PatternType,
  existingPatterns: Pattern[]
): Pattern | null {
  // First try to find by subject similarity (strongest signal)
  if (subject) {
    const bySubject = existingPatterns.find(p =>
      p.patternType === patternType && areSubjectsSimilar(p.subject, subject)
    );
    if (bySubject) return bySubject;
  }

  // Then check description similarity for same type
  const descLower = description.toLowerCase();
  const descWords = descLower.split(/\s+/).filter(w => w.length > 4);

  for (const pattern of existingPatterns) {
    if (pattern.patternType !== patternType) continue;

    const existingDescLower = pattern.description.toLowerCase();
    const existingWords = existingDescLower.split(/\s+/).filter(w => w.length > 4);

    // Check for significant word overlap (>30% of words match)
    const overlap = descWords.filter(w => existingWords.some(ew =>
      w === ew || w.includes(ew) || ew.includes(w)
    ));

    if (descWords.length > 0 && overlap.length / descWords.length >= 0.3) {
      return pattern;
    }
  }

  return null;
}

// =============================================================================
// Pattern Detection
// =============================================================================

interface PatternDetectionResult {
  new_patterns: {
    type: PatternType;
    description: string;
    subject?: string;
    evidence_sessions: string[];
    evidence_quotes: string[];
    time_span_weeks: number;
  }[];
  potential_patterns: {
    type: PatternType;
    description: string;
    subject?: string;
    evidence_sessions: string[];
    sessions_needed: number;
  }[];
  updated_patterns: {
    pattern_id: string;
    new_description: string;
    add_sessions: string[];
    new_quotes: string[];
    confidence_change: number;
  }[];
  contradicted_patterns: {
    pattern_id: string;
    contradiction: string;
    evidence_quote: string;
    severity: 'minor' | 'major';
  }[];
  resolved_patterns: {
    pattern_id: string;
    reason: string;
  }[];
}

function buildPatternDetectionPrompt(
  session: JournalSession,
  memoryNode: MemoryNode,
  recentSessions: { session: JournalSession; memory: MemoryNode | null }[],
  existingPatterns: Pattern[]
): string {
  // Format current session
  const currentSessionText = `
Date: ${session.startedAt.toISOString().split('T')[0]}
Summary: ${memoryNode.summary || 'No summary'}
Topics: ${memoryNode.topics.join(', ') || 'None'}
Emotions: ${memoryNode.emotions.join(', ') || 'None'}
People: ${memoryNode.peopleMentioned.join(', ') || 'None'}
Thoughts: ${memoryNode.thoughts.join('; ') || 'None'}
Unresolved Questions: ${memoryNode.unresolvedQuestions.join('; ') || 'None'}
Transcript:
${session.transcript || 'No transcript'}
  `.trim();

  // Format recent sessions
  const recentSessionsText = recentSessions
    .map(({ session: s, memory }) => {
      if (!memory) return `[${s.startedAt.toISOString().split('T')[0]}] (No summary available)`;
      return `
[${s.startedAt.toISOString().split('T')[0]}] Session ID: ${s.id}
Summary: ${memory.summary}
Emotions: ${memory.emotions.join(', ')}
Topics: ${memory.topics.join(', ')}
People: ${memory.peopleMentioned.join(', ')}
Thoughts: ${memory.thoughts.join('; ')}
      `.trim();
    })
    .join('\n\n');

  // Format existing patterns
  const existingPatternsText = existingPatterns.length === 0
    ? '(No existing patterns)'
    : existingPatterns
        .map((p) => `
[Pattern ID: ${p.id}]
Type: ${p.patternType}
Status: ${p.status}
Confidence: ${(p.confidence * 100).toFixed(0)}%
Subject: ${p.subject || 'General'}
Description: ${p.description}
Sessions: ${p.relatedSessions.length} sessions (${p.relatedSessions.join(', ')})
Evidence Quotes: ${p.evidenceQuotes.slice(0, 3).join(' | ') || 'None'}
        `.trim())
        .join('\n\n');

  return `You are analyzing journal sessions to identify patterns the user wouldn't notice themselves.

CURRENT SESSION (just completed):
${currentSessionText}

RECENT SESSIONS (past 2-3 months):
${recentSessionsText}

EXISTING PATTERNS:
${existingPatternsText}

---

YOUR TASK:

Analyze the current session in context of the user's history. Look for:

1. EMOTIONAL TRENDS
   - Shifts in baseline mood or energy
   - Recurring emotional states in specific contexts
   - Deviations from their usual patterns

2. OPINION EVOLUTION
   - How feelings about topics/people/situations have changed
   - Shifts that the user might not be aware of
   - Include specific quotes or evidence

3. RELATIONSHIP DYNAMICS
   - How they talk about specific people
   - Changes in tone, frequency, or context
   - People who appear or disappear from conversations

4. UNRESOLVED QUESTIONS
   - Things they keep bringing up without resolution
   - Decisions they're circling around
   - Questions they ask but don't explore

---

CRITICAL: AVOID DUPLICATE/SIMILAR PATTERNS

Before creating a new pattern, check the EXISTING PATTERNS above carefully:
- If an existing pattern covers the SAME TOPIC or PERSON, ADD to "updated_patterns" instead of "new_patterns"
- If an existing pattern is about a SIMILAR subject (e.g., "stress at work" vs "work stress"), UPDATE the existing one
- NEVER create two patterns about the same person, topic, or question
- Merge related observations into ONE comprehensive pattern
- Examples of patterns that should be MERGED (not created separately):
  * "Feeling stressed about job" and "Work anxiety" → UPDATE existing
  * "Relationship with Sarah" and "Sarah dynamics" → UPDATE existing
  * "Should I move?" and "Thinking about relocating" → UPDATE existing

---

CRITICAL REQUIREMENTS:

1. THRESHOLD FOR NEW PATTERNS:
   - Do NOT create a new pattern unless it spans 6+ sessions over 4+ weeks
   - Instead, note "potential_patterns" that are developing but not yet confirmed
   - This prevents false patterns from limited data

2. CONTRADICTION DETECTION:
   - If the current session contradicts an existing pattern, flag it
   - Include the specific contradiction and evidence
   - Don't automatically update - flag for user review

3. EVIDENCE QUALITY:
   - Include direct quotes from sessions as evidence
   - Quotes must actually appear in the session transcripts or summaries
   - Each pattern needs at least 3 distinct quotes as evidence

---

OUTPUT FORMAT:

Return a JSON object (and ONLY the JSON, no other text):
{
  "new_patterns": [
    {
      "type": "emotional_trend" | "opinion_evolution" | "relationship" | "unresolved_question",
      "description": "Detailed narrative description of the pattern with specific evidence",
      "subject": "optional - person name, topic, or question",
      "evidence_sessions": ["session_id_1", "session_id_2"],
      "evidence_quotes": ["exact quote 1", "exact quote 2"],
      "time_span_weeks": 5
    }
  ],
  "potential_patterns": [
    {
      "type": "...",
      "description": "Pattern that's developing but doesn't meet threshold yet",
      "subject": "optional",
      "evidence_sessions": ["..."],
      "sessions_needed": 3
    }
  ],
  "updated_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "new_description": "Updated narrative incorporating new evidence",
      "add_sessions": ["new session IDs to add"],
      "new_quotes": ["new supporting quotes"],
      "confidence_change": 0.05
    }
  ],
  "contradicted_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "contradiction": "What in this session contradicts the pattern",
      "evidence_quote": "The specific quote that contradicts",
      "severity": "minor" | "major"
    }
  ],
  "resolved_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "reason": "Why this pattern is no longer relevant"
    }
  ]
}

GUIDELINES:
- Be specific. Include quotes, dates, and concrete observations.
- Quality over quantity. Only create patterns with strong evidence.
- For opinion evolution, capture the SHIFT, not just current state.
- If nothing notable, return empty arrays. Don't force patterns.
- When in doubt about contradictions, flag for review rather than auto-updating.
- Only reference session IDs that exist in the RECENT SESSIONS list above.`;
}

function parsePatternResponse(text: string): PatternDetectionResult | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const result = JSON.parse(jsonStr);

    // Validate structure
    return {
      new_patterns: Array.isArray(result.new_patterns) ? result.new_patterns : [],
      potential_patterns: Array.isArray(result.potential_patterns) ? result.potential_patterns : [],
      updated_patterns: Array.isArray(result.updated_patterns) ? result.updated_patterns : [],
      contradicted_patterns: Array.isArray(result.contradicted_patterns) ? result.contradicted_patterns : [],
      resolved_patterns: Array.isArray(result.resolved_patterns) ? result.resolved_patterns : [],
    };
  } catch (error) {
    console.error('Failed to parse pattern response:', error);
    return null;
  }
}

/**
 * Main entry point: detect and update patterns after a session ends
 */
export async function detectAndUpdatePatterns(
  session: JournalSession,
  memoryNode: MemoryNode
): Promise<void> {
  console.log('🔍 Starting pattern detection...');

  try {
    // Load context
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentSessions = await db.getSessionsInDateRange(threeMonthsAgo, new Date());
    const existingPatterns = await db.getAllPatterns();

    // Build session+memory pairs for context
    const sessionsWithMemory: { session: JournalSession; memory: MemoryNode | null }[] = [];
    for (const s of recentSessions) {
      if (s.id === session.id) continue; // Skip current session
      const memory = await db.getMemoryNodeForSession(s.id);
      sessionsWithMemory.push({ session: s, memory });
    }

    // If not enough sessions, skip pattern detection
    if (sessionsWithMemory.length < 2) {
      console.log('📊 Not enough sessions for pattern detection');
      return;
    }

    // Build and run prompt
    const prompt = buildPatternDetectionPrompt(session, memoryNode, sessionsWithMemory, existingPatterns);
    const response = await runPatternPrompt(prompt);

    // Parse response
    const result = parsePatternResponse(response);
    if (!result) {
      console.log('⚠️ Failed to parse pattern detection response');
      return;
    }

    // 1. Create new patterns (only if they meet threshold and no similar exists)
    for (const newPattern of result.new_patterns) {
      // Check for similar existing pattern first
      const similarPattern = findSimilarPattern(
        newPattern.subject,
        newPattern.description,
        newPattern.type,
        existingPatterns
      );

      if (similarPattern) {
        // Merge into existing pattern instead of creating new
        console.log(`🔄 Merging "${newPattern.subject}" into existing pattern "${similarPattern.subject}"`);
        const mergedSessions = [...new Set([...similarPattern.relatedSessions, ...newPattern.evidence_sessions])];
        const mergedQuotes = [...new Set([...similarPattern.evidenceQuotes, ...newPattern.evidence_quotes])].slice(0, 10);
        await db.updatePattern(similarPattern.id, {
          description: newPattern.description, // Use newer, potentially more comprehensive description
          relatedSessions: mergedSessions,
          evidenceQuotes: mergedQuotes,
          confidence: Math.min(0.95, similarPattern.confidence + 0.1),
          lastUpdated: new Date(),
        });
        continue;
      }

      // Validate threshold requirements
      if (newPattern.evidence_sessions.length < MIN_SESSIONS_FOR_ACTIVE) {
        console.log(`📋 Pattern "${newPattern.subject}" needs more sessions (${newPattern.evidence_sessions.length}/${MIN_SESSIONS_FOR_ACTIVE})`);
        // Store as developing instead
        result.potential_patterns.push({
          ...newPattern,
          sessions_needed: MIN_SESSIONS_FOR_ACTIVE - newPattern.evidence_sessions.length,
        });
        continue;
      }
      if (newPattern.time_span_weeks < MIN_WEEKS_FOR_ACTIVE) {
        console.log(`📋 Pattern "${newPattern.subject}" needs more time (${newPattern.time_span_weeks}/${MIN_WEEKS_FOR_ACTIVE} weeks)`);
        result.potential_patterns.push({
          ...newPattern,
          sessions_needed: 1,
        });
        continue;
      }
      if (newPattern.evidence_quotes.length < MIN_QUOTES_FOR_ACTIVE) {
        console.log(`📋 Pattern "${newPattern.subject}" needs more quotes (${newPattern.evidence_quotes.length}/${MIN_QUOTES_FOR_ACTIVE})`);
        continue;
      }

      const now = new Date();
      await db.createPattern({
        id: uuid(),
        patternType: newPattern.type,
        description: newPattern.description,
        subject: newPattern.subject,
        firstObserved: now,
        lastUpdated: now,
        relatedSessions: newPattern.evidence_sessions,
        evidenceQuotes: newPattern.evidence_quotes,
        confidence: 0.6, // Start at 0.6 since it passed threshold
        status: 'active',
        createdAt: now,
      });
      console.log(`✅ Created new active pattern: ${newPattern.subject || newPattern.type}`);
    }

    // 2. Store potential patterns (developing, not yet confirmed)
    for (const potential of result.potential_patterns) {
      // First check for similar ACTIVE pattern - merge into that
      const similarActive = findSimilarPattern(
        potential.subject,
        potential.description,
        potential.type,
        existingPatterns.filter(p => p.status === 'active')
      );

      if (similarActive) {
        // Merge into existing active pattern
        console.log(`🔄 Merging developing "${potential.subject}" into active pattern "${similarActive.subject}"`);
        const mergedSessions = [...new Set([...similarActive.relatedSessions, ...potential.evidence_sessions])];
        await db.updatePattern(similarActive.id, {
          relatedSessions: mergedSessions,
          lastUpdated: new Date(),
        });
        continue;
      }

      // Check if we already have a developing pattern for this subject
      const existing = potential.subject
        ? await db.findDevelopingPatternBySubject(potential.subject)
        : null;

      // Also check for similar developing patterns
      const similarDeveloping = !existing ? findSimilarPattern(
        potential.subject,
        potential.description,
        potential.type,
        existingPatterns.filter(p => p.status === 'developing')
      ) : null;

      const patternToUpdate = existing || similarDeveloping;

      if (patternToUpdate) {
        // Update existing developing pattern
        const mergedSessions = [...new Set([...patternToUpdate.relatedSessions, ...potential.evidence_sessions])];
        await db.updatePattern(patternToUpdate.id, {
          relatedSessions: mergedSessions,
          lastUpdated: new Date(),
          description: potential.description, // Update description with latest context
        });
        console.log(`📝 Updated developing pattern: ${patternToUpdate.subject || potential.subject}`);

        // Check if it now meets threshold
        if (mergedSessions.length >= MIN_SESSIONS_FOR_ACTIVE) {
          await checkAndPromotePattern(patternToUpdate.id);
        }
      } else {
        // Create new developing pattern
        const now = new Date();
        await db.createPattern({
          id: uuid(),
          patternType: potential.type,
          description: potential.description,
          subject: potential.subject,
          firstObserved: now,
          lastUpdated: now,
          relatedSessions: potential.evidence_sessions,
          evidenceQuotes: [],
          confidence: 0.3,
          status: 'developing',
          createdAt: now,
        });
        console.log(`📋 Created developing pattern: ${potential.subject || potential.type}`);
      }
    }

    // 3. Update existing patterns with new evidence
    for (const update of result.updated_patterns) {
      const existing = await db.getPattern(update.pattern_id);
      if (!existing) continue;

      const newSessions = [...new Set([...existing.relatedSessions, ...update.add_sessions])];
      const newQuotes = [...existing.evidenceQuotes, ...update.new_quotes].slice(0, 10); // Cap at 10 quotes
      const newConfidence = Math.min(0.95, existing.confidence + update.confidence_change);

      await db.updatePattern(update.pattern_id, {
        description: update.new_description,
        relatedSessions: newSessions,
        evidenceQuotes: newQuotes,
        confidence: newConfidence,
        lastUpdated: new Date(),
      });
      console.log(`📝 Updated pattern: ${existing.subject || existing.patternType}`);
    }

    // 4. Flag contradictions for user review
    for (const contradiction of result.contradicted_patterns) {
      const existing = await db.getPattern(contradiction.pattern_id);
      if (!existing) continue;

      const counterEvidence: PatternCounterEvidence[] = existing.counterEvidence || [];
      counterEvidence.push({
        sessionId: session.id,
        quote: contradiction.evidence_quote,
        description: contradiction.contradiction,
        severity: contradiction.severity,
        detectedAt: new Date().toISOString(),
      });

      await db.updatePattern(contradiction.pattern_id, {
        status: 'needs_review',
        counterEvidence,
        contradictionFlaggedAt: new Date(),
        lastUpdated: new Date(),
      });
      console.log(`⚠️ Flagged contradiction for pattern: ${existing.subject || existing.patternType}`);
    }

    // 5. Mark resolved patterns
    for (const resolved of result.resolved_patterns) {
      await db.updatePattern(resolved.pattern_id, {
        status: 'resolved',
        lastUpdated: new Date(),
      });
      console.log(`✓ Resolved pattern: ${resolved.pattern_id}`);
    }

    console.log('🔍 Pattern detection complete');
  } catch (error) {
    console.error('Pattern detection error:', error);
    // Don't throw - pattern detection failure shouldn't block session processing
  }
}

/**
 * Check if a developing pattern should be promoted to active
 */
async function checkAndPromotePattern(patternId: string): Promise<void> {
  const pattern = await db.getPattern(patternId);
  if (!pattern || pattern.status !== 'developing') return;

  // Check session count
  if (pattern.relatedSessions.length < MIN_SESSIONS_FOR_ACTIVE) return;

  // Check time span
  const firstSession = pattern.firstObserved;
  const weeksSinceFirst = (Date.now() - firstSession.getTime()) / (7 * 24 * 60 * 60 * 1000);
  if (weeksSinceFirst < MIN_WEEKS_FOR_ACTIVE) return;

  // Promote to active
  await db.updatePattern(patternId, {
    status: 'active',
    confidence: 0.6,
    lastUpdated: new Date(),
  });
  console.log(`🎉 Promoted pattern to active: ${pattern.subject || pattern.patternType}`);
}

// =============================================================================
// Pattern Query Functions
// =============================================================================

/**
 * Get patterns that are confirmed and confident enough for use in conversations
 */
export async function getConfirmedPatterns(): Promise<Pattern[]> {
  const patterns = await db.getActivePatterns();
  return patterns.filter((p) => p.confidence >= 0.5);
}

/**
 * Get patterns relevant to the current conversation context
 */
export async function getRelevantPatternsForContext(currentContext: string): Promise<Pattern[]> {
  const confirmedPatterns = await getConfirmedPatterns();
  if (confirmedPatterns.length === 0) return [];

  // Simple relevance matching based on subject/description keywords
  const contextLower = currentContext.toLowerCase();
  const relevantPatterns = confirmedPatterns.filter((pattern) => {
    const subject = pattern.subject?.toLowerCase() || '';
    const description = pattern.description.toLowerCase();
    return (
      contextLower.includes(subject) ||
      subject.split(' ').some((word) => word.length > 3 && contextLower.includes(word)) ||
      description.split(' ').some((word) => word.length > 5 && contextLower.includes(word))
    );
  });

  return relevantPatterns.slice(0, 5); // Limit to top 5 relevant patterns
}

/**
 * Get unresolved questions patterns
 */
export async function getUnresolvedQuestions(): Promise<Pattern[]> {
  const patterns = await db.getPatternsByType('unresolved_question');
  return patterns.filter((p) => p.status === 'active' && p.confidence >= 0.5);
}

/**
 * Get relationship patterns
 */
export async function getRelationshipPatterns(): Promise<Pattern[]> {
  const patterns = await db.getPatternsByType('relationship');
  return patterns.filter((p) => p.status === 'active');
}

// =============================================================================
// Pattern Management
// =============================================================================

/**
 * Resolve a contradiction - user decides what to do
 */
export async function resolveContradiction(
  patternId: string,
  action: 'keep' | 'update' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    await db.deletePattern(patternId);
    return;
  }

  if (action === 'keep') {
    // Clear contradiction flag, keep pattern
    await db.updatePattern(patternId, {
      status: 'active',
      counterEvidence: [],
      contradictionFlaggedAt: undefined,
    });
    return;
  }

  if (action === 'update') {
    // For now, just clear the flag - a more sophisticated implementation
    // would regenerate the description using the LLM
    await db.updatePattern(patternId, {
      status: 'active',
      counterEvidence: [],
      contradictionFlaggedAt: undefined,
    });
  }
}

/**
 * Update patterns after a session is deleted (cascade)
 */
export async function updatePatternsAfterSessionDeletion(sessionId: string): Promise<void> {
  const patterns = await db.getAllPatterns();

  for (const pattern of patterns) {
    if (!pattern.relatedSessions.includes(sessionId)) continue;

    // Remove deleted session from evidence
    const updatedSessions = pattern.relatedSessions.filter((s) => s !== sessionId);
    const remainingCount = updatedSessions.length;

    if (remainingCount === 0) {
      // No evidence left - hard delete the pattern
      await db.hardDeletePattern(pattern.id);
      console.log(`🗑️ Deleted pattern (no sessions left): ${pattern.subject || pattern.patternType}`);
    } else if (remainingCount < 3) {
      // Insufficient evidence - flag for review
      await db.updatePattern(pattern.id, {
        relatedSessions: updatedSessions,
        status: 'insufficient_evidence',
        confidence: Math.max(0.2, pattern.confidence - 0.2),
        lastUpdated: new Date(),
      });
      console.log(`⚠️ Pattern has insufficient evidence: ${pattern.subject || pattern.patternType}`);
    } else {
      // Still has enough evidence - just update the list
      await db.updatePattern(pattern.id, {
        relatedSessions: updatedSessions,
        confidence: Math.max(0.3, pattern.confidence - 0.05),
        lastUpdated: new Date(),
      });
    }
  }
}
