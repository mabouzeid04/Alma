# Feature 2: Smarter Pattern Discovery

## Implementation Order

| Order | Feature | Dependency |
|-------|---------|------------|
| **1** | **Pattern Discovery** | Foundation - no dependencies |
| 2 | AI-Generated Prompts | Uses patterns |
| 3 | Personalized Conversations | Uses patterns |
| 4 | Enhanced Insights | Uses patterns |
| 5 | Working Theories | Builds on patterns |

---

## Overview

**What**: An enhanced memory system that automatically identifies patterns the user wouldn't notice themselves - emotional trends, opinion evolution, relationship dynamics, and recurring unresolved questions.

**Why**: This is the core value proposition of SecondBrain. The user wants to discover things about themselves they wouldn't notice, especially how their feelings and opinions shift over time.

**Philosophy**: Emergent LLM analysis over deterministic rules. Give the LLM full context and ask "what patterns do you notice?" rather than counting occurrences or categorizing sentiment into buckets.

---

## Data Integrity Safeguards

**This section addresses the risk of false patterns persisting based on incomplete information.**

### Creation Thresholds

Patterns are NOT created from sparse data. Requirements:
- **Minimum 6 sessions** must mention the topic/pattern
- **Minimum 4 weeks** span between first and most recent evidence
- **Confidence score** starts at 0.5 and increases with more evidence

This prevents premature pattern creation from a few off-hand mentions.

### Contradiction Detection

When new sessions contradict existing patterns:
1. Pattern is flagged with `status: 'needs_review'`
2. Counter-evidence is stored alongside the pattern
3. User is notified in Settings → Patterns
4. User decides: update pattern, keep as-is, or delete

### Cascading Deletion

When sessions are deleted:
1. Pattern's `relatedSessions` array is updated to remove deleted session IDs
2. If pattern has fewer than 3 remaining sessions, it's marked `status: 'insufficient_evidence'`
3. If pattern has 0 remaining sessions, it's automatically deleted
4. Patterns with insufficient evidence appear in Settings for user review

### User Control

Patterns are auto-generated but users have full control:
- **Settings → Patterns** shows all patterns with confidence scores
- Users can view evidence (linked sessions) for each pattern
- Users can delete any pattern they disagree with
- Contradictions are surfaced for manual resolution

---

## Pattern Types

The system tracks four types of patterns, stored as free-form narrative descriptions:

### A. Emotional Trends
How emotional states shift across sessions.

**Examples:**
- "User consistently feels anxious on Sunday evenings when thinking about the work week. This has appeared in 4 sessions over the past month, often accompanied by mentions of their manager."
- "User's baseline mood has been lower than usual for the past two weeks. They mention feeling 'tired' or 'drained' more frequently, which correlates with increased workload."
- "User feels energized and optimistic when discussing side projects, but deflated when talking about their day job."

### B. Opinion Evolution
How feelings about topics, people, or situations change over time.

**Examples:**
- "In August, user was desperate to leave their internship, describing it as 'suffocating' and 'pointless.' By late September, they expressed nostalgia for the structure and purpose it provided. This shift happened after starting college classes."
- "User's opinion of their manager has softened. Early mentions were frustrated ('micromanaging', 'doesn't trust me'). Recent sessions show more understanding ('under a lot of pressure', 'trying their best')."

### C. Relationship Dynamics
How the user talks about specific people over time.

**Examples:**
- "Sarah appears in 8 sessions. Early mentions were excited and romantic. Recent mentions focus on logistics and minor frustrations. User hasn't talked about deeper connection in 3 weeks."
- "User mentions their mother primarily when stressed about work. There's an implicit expectation pattern - user feels they're not meeting their mother's standards."
- "Tom disappeared from conversations after October 12. Previously mentioned weekly as a close friend. User hasn't explained why."

### D. Recurring Unresolved Questions
Things mentioned multiple times without resolution.

**Examples:**
- "User has mentioned 'should I switch majors?' in 4 sessions over 6 weeks. They list pros and cons but never reach a decision or take action."
- "The question of whether to talk to their manager about workload has come up 3 times. User keeps saying they 'should' but finds reasons to delay."
- "User repeatedly expresses wanting to be more social but hasn't explored what's actually stopping them."

---

## Data Model

### Patterns Table

```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,  -- 'emotional_trend' | 'opinion_evolution' | 'relationship' | 'unresolved_question'
  description TEXT NOT NULL,   -- Free-form narrative describing the pattern
  subject TEXT,                -- Optional: person name, topic, or question being tracked

  -- Evidence tracking
  first_observed TEXT NOT NULL, -- ISO timestamp
  last_updated TEXT NOT NULL,   -- ISO timestamp
  related_sessions TEXT NOT NULL, -- JSON array of session IDs
  evidence_quotes TEXT,         -- JSON array of supporting quotes from sessions

  -- Confidence and status
  confidence REAL DEFAULT 0.5,  -- 0.0 to 1.0, increases with evidence
  status TEXT DEFAULT 'developing', -- 'developing' | 'active' | 'needs_review' | 'insufficient_evidence' | 'resolved'

  -- Contradiction handling
  counter_evidence TEXT,        -- JSON array of contradicting observations
  contradiction_flagged_at TEXT, -- ISO timestamp when contradiction was detected

  -- Lifecycle
  created_at TEXT NOT NULL,
  deleted_at TEXT               -- Soft delete for audit trail
);

CREATE INDEX idx_patterns_type ON patterns (pattern_type);
CREATE INDEX idx_patterns_status ON patterns (status);
CREATE INDEX idx_patterns_confidence ON patterns (confidence DESC);
CREATE INDEX idx_patterns_updated ON patterns (last_updated DESC);
```

### TypeScript Interface

```typescript
interface Pattern {
  id: string;
  patternType: 'emotional_trend' | 'opinion_evolution' | 'relationship' | 'unresolved_question';
  description: string;  // Free-form narrative
  subject?: string;     // Person name, topic, or question

  // Evidence
  firstObserved: Date;
  lastUpdated: Date;
  relatedSessions: string[];  // Session IDs
  evidenceQuotes: string[];   // Supporting quotes

  // Confidence and status
  confidence: number;  // 0.0 to 1.0
  status: 'developing' | 'active' | 'needs_review' | 'insufficient_evidence' | 'resolved';

  // Contradiction handling
  counterEvidence?: string[];  // Contradicting observations
  contradictionFlaggedAt?: Date;

  // Lifecycle
  createdAt: Date;
  deletedAt?: Date;  // Soft delete
}

type PatternStatus =
  | 'developing'           // < 6 sessions, still gathering evidence
  | 'active'               // 6+ sessions, confident pattern
  | 'needs_review'         // Contradiction detected, user should review
  | 'insufficient_evidence' // Sessions deleted, not enough evidence remaining
  | 'resolved';            // User explicitly marked as no longer relevant
```

---

## Detection Flow

Pattern detection runs **after each session ends**, as part of the existing session synthesis flow.

### Current Flow (in `conversation.tsx`)
```typescript
// After session ends:
const memoryNode = await synthesizeMemory(session);
await saveMemoryNode(memoryNode);
const vectors = await generateMemoryVectors(session, memoryNode);
await saveMemoryVectors(vectors);
await updatePersonalKnowledge(session);
```

### New Flow
```typescript
// After session ends:
const memoryNode = await synthesizeMemory(session);
await saveMemoryNode(memoryNode);
const vectors = await generateMemoryVectors(session, memoryNode);
await saveMemoryVectors(vectors);
await updatePersonalKnowledge(session);
await detectAndUpdatePatterns(session, memoryNode);  // NEW
```

---

## Pattern Detection Logic

### `detectAndUpdatePatterns(session, memoryNode)`

**Step 1: Gather Context**

Load data the LLM needs to identify patterns:
- The new session's transcript and memory node
- Recent sessions (past 2-3 months) with their memory nodes
- All existing patterns (both active and resolved)

**Step 2: Build Prompt**

```
You are analyzing journal sessions to identify patterns the user wouldn't notice themselves.

CURRENT SESSION (just completed):
Date: [session date]
[Full transcript or rich summary]

RECENT SESSIONS (past 2-3 months):
[For each session: date, summary, emotions, key topics, people mentioned]

EXISTING PATTERNS:
[For each pattern: type, description, confidence, status, related sessions, evidence quotes]

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
   - Quotes must actually appear in the session transcripts
   - Each pattern needs at least 3 distinct quotes as evidence

---

OUTPUT FORMAT:

Return a JSON object:
{
  "new_patterns": [
    {
      "type": "emotional_trend" | "opinion_evolution" | "relationship" | "unresolved_question",
      "description": "Detailed narrative description of the pattern with specific evidence",
      "subject": "optional - person name, topic, or question",
      "evidence_sessions": ["session_id_1", "session_id_2", ...],  // Must be 6+ sessions
      "evidence_quotes": ["exact quote 1", "exact quote 2", ...],  // Must be 3+ quotes
      "time_span_weeks": 5  // Must be 4+ weeks
    }
  ],
  "potential_patterns": [
    {
      "type": "...",
      "description": "Pattern that's developing but doesn't meet threshold yet",
      "evidence_sessions": ["..."],  // 2-5 sessions
      "sessions_needed": 3  // How many more sessions needed to confirm
    }
  ],
  "updated_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "new_description": "Updated narrative incorporating new evidence",
      "add_sessions": ["new session IDs to add"],
      "new_quotes": ["new supporting quotes"],
      "confidence_change": 0.05  // How much to increase confidence (0.0 to 0.1)
    }
  ],
  "contradicted_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "contradiction": "What in this session contradicts the pattern",
      "evidence_quote": "The specific quote that contradicts",
      "severity": "minor" | "major"  // Minor = could be temporary, Major = fundamentally contradicts
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
```

**Step 3: Parse and Apply**

```typescript
async function detectAndUpdatePatterns(
  session: JournalSession,
  memoryNode: MemoryNode
): Promise<void> {
  // Load context
  const recentSessions = await getSessionsInDateRange(threeMonthsAgo, now);
  const existingPatterns = await getAllPatterns();

  // Build and run prompt
  const prompt = buildPatternDetectionPrompt(session, memoryNode, recentSessions, existingPatterns);
  const response = await runPromptWithModel(prompt, modelPref, signal, {
    temperature: 0.3,  // Lower temperature for analytical task
    maxTokens: 2000,
  });

  // Parse response
  const result = parsePatternResponse(response);

  // 1. Create new patterns (only if they meet threshold)
  for (const newPattern of result.new_patterns) {
    // Validate threshold requirements
    if (newPattern.evidence_sessions.length < 6) continue;
    if (newPattern.time_span_weeks < 4) continue;
    if (newPattern.evidence_quotes.length < 3) continue;

    await createPattern({
      id: uuid(),
      patternType: newPattern.type,
      description: newPattern.description,
      subject: newPattern.subject,
      firstObserved: new Date(),
      lastUpdated: new Date(),
      relatedSessions: newPattern.evidence_sessions,
      evidenceQuotes: newPattern.evidence_quotes,
      confidence: 0.6,  // Start at 0.6 since it passed threshold
      status: 'active',
      createdAt: new Date(),
    });
  }

  // 2. Store potential patterns (developing, not yet confirmed)
  for (const potential of result.potential_patterns) {
    // Check if we already have a developing pattern for this subject
    const existing = await findDevelopingPattern(potential.subject);
    if (existing) {
      await updatePattern(existing.id, {
        relatedSessions: [...existing.relatedSessions, ...potential.evidence_sessions],
        lastUpdated: new Date(),
      });
    } else {
      await createPattern({
        id: uuid(),
        patternType: potential.type,
        description: potential.description,
        subject: potential.subject,
        firstObserved: new Date(),
        lastUpdated: new Date(),
        relatedSessions: potential.evidence_sessions,
        evidenceQuotes: [],
        confidence: 0.3,
        status: 'developing',  // Not yet active
        createdAt: new Date(),
      });
    }
  }

  // 3. Update existing patterns with new evidence
  for (const update of result.updated_patterns) {
    const existing = await getPattern(update.pattern_id);
    if (!existing) continue;

    const newConfidence = Math.min(0.95, existing.confidence + update.confidence_change);

    await updatePattern(update.pattern_id, {
      description: update.new_description,
      relatedSessions: [...existing.relatedSessions, ...update.add_sessions],
      evidenceQuotes: [...existing.evidenceQuotes, ...update.new_quotes],
      confidence: newConfidence,
      lastUpdated: new Date(),
    });
  }

  // 4. Flag contradictions for user review
  for (const contradiction of result.contradicted_patterns) {
    const existing = await getPattern(contradiction.pattern_id);
    if (!existing) continue;

    const counterEvidence = existing.counterEvidence || [];
    counterEvidence.push({
      sessionId: session.id,
      quote: contradiction.evidence_quote,
      description: contradiction.contradiction,
      severity: contradiction.severity,
      detectedAt: new Date().toISOString(),
    });

    await updatePattern(contradiction.pattern_id, {
      status: 'needs_review',
      counterEvidence,
      contradictionFlaggedAt: new Date(),
      lastUpdated: new Date(),
    });
  }

  // 5. Mark resolved patterns
  for (const resolved of result.resolved_patterns) {
    await updatePattern(resolved.pattern_id, {
      status: 'resolved',
      lastUpdated: new Date(),
    });
  }
}
```

---

## Database Operations

Add to `database.ts`:

```typescript
// Pattern CRUD operations

export async function createPattern(pattern: Pattern): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO patterns (
      id, pattern_type, description, subject,
      first_observed, last_updated, related_sessions, evidence_quotes,
      confidence, status, counter_evidence, contradiction_flagged_at,
      created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pattern.id,
      pattern.patternType,
      pattern.description,
      pattern.subject ?? null,
      pattern.firstObserved.toISOString(),
      pattern.lastUpdated.toISOString(),
      JSON.stringify(pattern.relatedSessions),
      JSON.stringify(pattern.evidenceQuotes || []),
      pattern.confidence,
      pattern.status,
      JSON.stringify(pattern.counterEvidence || []),
      pattern.contradictionFlaggedAt?.toISOString() ?? null,
      pattern.createdAt.toISOString(),
      pattern.deletedAt?.toISOString() ?? null,
    ]
  );
}

export async function getActivePatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY confidence DESC, last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getPatternsNeedingReview(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE status IN ('needs_review', 'insufficient_evidence') AND deleted_at IS NULL
     ORDER BY contradiction_flagged_at DESC`
  );
  return rows.map(rowToPattern);
}

export async function deletePattern(id: string): Promise<void> {
  const database = await getDatabase();
  // Soft delete for audit trail
  await database.runAsync(
    `UPDATE patterns SET deleted_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function hardDeletePattern(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM patterns WHERE id = ?`, [id]);
}
```

---

## Session Deletion Cascade

When a session is deleted, patterns that relied on it must be updated:

```typescript
// In database.ts - enhance deleteSession()

export async function deleteSession(id: string): Promise<void> {
  const database = await getDatabase();

  // 1. Delete the session (cascades to messages, memory_nodes, memory_vectors)
  await database.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);

  // 2. Update all patterns that referenced this session
  await updatePatternsAfterSessionDeletion(id);
}

async function updatePatternsAfterSessionDeletion(sessionId: string): Promise<void> {
  const patterns = await getAllPatterns();

  for (const pattern of patterns) {
    if (!pattern.relatedSessions.includes(sessionId)) continue;

    // Remove deleted session from evidence
    const updatedSessions = pattern.relatedSessions.filter(s => s !== sessionId);
    const remainingCount = updatedSessions.length;

    if (remainingCount === 0) {
      // No evidence left - delete the pattern
      await hardDeletePattern(pattern.id);
    } else if (remainingCount < 3) {
      // Insufficient evidence - flag for review
      await updatePattern(pattern.id, {
        relatedSessions: updatedSessions,
        status: 'insufficient_evidence',
        confidence: Math.max(0.2, pattern.confidence - 0.2),
        lastUpdated: new Date(),
      });
    } else {
      // Still has enough evidence - just update the list
      await updatePattern(pattern.id, {
        relatedSessions: updatedSessions,
        confidence: Math.max(0.3, pattern.confidence - 0.05),
        lastUpdated: new Date(),
      });
    }
  }
}
```

---

## Settings UI: Pattern Management

Users can review and manage patterns in **Settings → Patterns**:

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Patterns                                                   │
│                                                             │
│  ⚠️ 2 patterns need your review                             │  ← Alert banner
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  NEEDS REVIEW                                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ Work stress pattern                                  ││
│  │                                                         ││
│  │ "You get stressed about work deadlines"                 ││
│  │                                                         ││
│  │ Contradiction detected:                                 ││
│  │ "Actually work has been great lately, I'm really       ││
│  │ enjoying it" - Dec 28                                   ││
│  │                                                         ││
│  │ [Keep Pattern] [Update] [Delete]                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  ACTIVE PATTERNS                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Relationship: Sarah                          78% ████▒▒ ││
│  │ "You talk about Sarah mostly in logistics contexts..." ││
│  │ Based on 8 sessions                        [View] [🗑️]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Unresolved: Career change                    65% ███▒▒▒ ││
│  │ "You keep mentioning wanting to switch careers..."     ││
│  │ Based on 6 sessions                        [View] [🗑️]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pattern Detail View

```
┌─────────────────────────────────────────────────────────────┐
│  ← Relationship: Sarah                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "You talk about Sarah mostly in logistics contexts        │
│  lately. Early mentions were more emotionally warm.        │
│  You haven't discussed deeper connection in 3 weeks."      │
│                                                             │
│  ████████░░░░░░░░ 78% confident                            │
│  First noticed: Oct 15 · 8 sessions                         │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  Evidence                                                   │
│                                                             │
│  "Sarah and I are just coordinating schedules lately"      │
│  Dec 20                                           [View →] │
│                                                             │
│  "We used to have date nights, now it's all logistics"     │
│  Dec 12                                           [View →] │
│                                                             │
│  "I miss when we actually talked about stuff"              │
│  Nov 28                                           [View →] │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  [Delete This Pattern]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Contradiction Resolution Flow

When user taps a pattern needing review:

1. Show the original pattern description
2. Show the contradicting evidence with session link
3. Options:
   - **Keep Pattern** - Dismiss contradiction, pattern stays as-is
   - **Update Pattern** - AI regenerates description incorporating new info
   - **Delete Pattern** - Remove entirely

```typescript
async function resolveContradiction(
  patternId: string,
  action: 'keep' | 'update' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    await deletePattern(patternId);
    return;
  }

  if (action === 'keep') {
    // Clear contradiction flag, keep pattern
    await updatePattern(patternId, {
      status: 'active',
      counterEvidence: [],
      contradictionFlaggedAt: undefined,
    });
    return;
  }

  if (action === 'update') {
    // Regenerate pattern description with all evidence including contradictions
    const pattern = await getPattern(patternId);
    const sessions = await getSessionsByIds(pattern.relatedSessions);
    const newDescription = await regeneratePatternDescription(pattern, sessions);

    await updatePattern(patternId, {
      description: newDescription,
      status: 'active',
      counterEvidence: [],  // Incorporated into new description
      contradictionFlaggedAt: undefined,
    });
  }
}
```

---

## New Service: `patterns.ts`

Create `app/src/services/patterns.ts`:

```typescript
/**
 * Pattern Discovery Service
 *
 * Detects and tracks patterns across journal sessions:
 * - Emotional trends
 * - Opinion evolution
 * - Relationship dynamics
 * - Recurring unresolved questions
 */

import { JournalSession, MemoryNode } from '../types';
import { Pattern } from '../types';
import * as db from './database';
import { runPromptWithModel } from './ai';

export async function detectAndUpdatePatterns(
  session: JournalSession,
  memoryNode: MemoryNode
): Promise<void> {
  // Implementation as described above
}

export async function getRelevantPatternsForContext(
  currentContext: string
): Promise<Pattern[]> {
  // Semantic matching of patterns to current conversation
  // Used by conversation AI to inject relevant patterns
}

export async function getUnresolvedQuestions(): Promise<Pattern[]> {
  return db.getPatternsByType('unresolved_question');
}

export async function getRelationshipPatterns(): Promise<Pattern[]> {
  return db.getPatternsByType('relationship');
}
```

---

## Integration Points

### 1. Session End (conversation.tsx)

After session synthesis completes:
```typescript
import { detectAndUpdatePatterns } from '@/services/patterns';

// In endSession():
await detectAndUpdatePatterns(session, memoryNode);
```

### 2. Conversation AI Context (ai.ts)

Enhance `buildSystemPrompt()` to include relevant patterns:
```typescript
function buildSystemPrompt(
  personalKnowledge: string,
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[],
  relevantPatterns: Pattern[]  // NEW
): string {
  // ... existing prompt building ...

  if (relevantPatterns.length > 0) {
    prompt += '\n\nPATTERNS YOU\'VE NOTICED:';
    for (const pattern of relevantPatterns) {
      prompt += `\n- ${pattern.description}`;
    }
    prompt += '\n\n(Reference these naturally if relevant. Don\'t force it.)';
  }
}
```

### 3. Prompts Generation (Feature 1)

Unresolved questions feed directly into prompt generation:
```typescript
const unresolvedQuestions = await getPatternsByType('unresolved_question');
// Use these to generate prompts like "You've mentioned X several times..."
```

### 4. Insights Generation (Feature 4)

Patterns provide evidence for insights:
```typescript
const patterns = await getActivePatterns();
// Include in insights prompt for trend analysis
```

---

## Files to Create/Modify

### New Files
- `app/src/services/patterns.ts` - Pattern detection, management, and cascade logic
- `app/app/patterns.tsx` - Settings UI for pattern management
- `app/src/hooks/usePatterns.ts` - Hook for patterns screen state
- `app/src/components/PatternCard.tsx` - Pattern display card
- `app/src/components/ContradictionReview.tsx` - Contradiction resolution UI

### Modified Files
- `app/src/services/database.ts` - Add patterns table, CRUD, and cascade deletion
- `app/src/services/ai.ts` - Enhance system prompt with patterns (only active ones)
- `app/app/conversation.tsx` - Call pattern detection after session ends
- `app/app/settings.tsx` - Add link to Patterns screen, show review badge
- `app/src/types/index.ts` - Export Pattern type and related interfaces

---

## Example Scenarios

### Scenario 1: Detecting Opinion Evolution

**Session 1 (August 15)**: "Ugh, this internship is killing me. I can't wait to get back to college. The structure is suffocating."

**Session 2 (September 20)**: "College is weird. I kind of miss having a clear purpose every day like at the internship."

**Pattern Created**:
```json
{
  "patternType": "opinion_evolution",
  "description": "User's feelings about their internship have shifted significantly. In mid-August, they described it as 'suffocating' and couldn't wait to leave. By late September, after returning to college, they expressed nostalgia for the structure and purpose it provided. This suggests the internship may have been more valuable than they realized in the moment.",
  "subject": "internship",
  "relatedSessions": ["session-aug-15", "session-sep-20"]
}
```

### Scenario 2: Detecting Unresolved Question

**Session 1**: "I've been thinking about whether I should switch to CS. The job market is better but I love psychology."

**Session 2**: "My advisor asked about my major and I just... I don't know. Still torn about the CS thing."

**Session 3**: "Everyone says CS is the smart choice. But is it what I want?"

**Pattern Created**:
```json
{
  "patternType": "unresolved_question",
  "description": "User has been deliberating about switching majors from psychology to CS for at least 3 sessions over several weeks. They acknowledge the practical benefits of CS (job market, 'smart choice') but express attachment to psychology. The question remains unresolved - they list pros and cons but haven't made a decision or identified what's actually holding them back.",
  "subject": "should I switch majors to CS?",
  "relatedSessions": ["session-1", "session-2", "session-3"]
}
```

### Scenario 3: Detecting Relationship Pattern

**Sessions over 2 months**: User mentions "Sarah" 8 times.

**Pattern Created**:
```json
{
  "patternType": "relationship",
  "description": "Sarah (girlfriend) appears frequently in sessions. Early mentions (August) were emotionally warm - user described date nights, feeling connected, excitement about future. Recent mentions (late September/October) focus primarily on logistics (schedules, chores, plans) with occasional minor frustrations. User hasn't talked about deeper emotional connection or relationship satisfaction in 3 weeks. This shift may or may not be significant, but it's worth noting.",
  "subject": "Sarah",
  "relatedSessions": ["session-1", "session-3", "session-5", "session-7", "session-8", "session-10", "session-12", "session-14"]
}
```

---

## Success Criteria

After implementation:

### Pattern Quality
- [ ] Patterns only created with 6+ sessions over 4+ weeks (no premature patterns)
- [ ] Patterns stored as rich narratives with evidence quotes
- [ ] Opinion shifts captured with before/after context
- [ ] Confidence scores accurately reflect evidence strength

### Data Integrity
- [ ] Contradictions detected and flagged for user review
- [ ] Session deletion properly cascades to patterns
- [ ] Patterns with insufficient evidence marked for review
- [ ] No orphaned patterns (all have valid session references)

### User Control
- [ ] Settings → Patterns screen shows all patterns
- [ ] Users can view evidence for each pattern
- [ ] Users can delete patterns they disagree with
- [ ] Contradiction resolution flow works (keep/update/delete)

### System Behavior
- [ ] Only `active` status patterns used in conversations
- [ ] `developing` patterns not surfaced until confirmed
- [ ] Pattern detection doesn't create noise

---

## Testing Approach

1. **Threshold testing**
   - Sessions 1-5: No patterns should be created
   - Session 6+ over 4 weeks: Pattern may be created if evidence is strong
   - Verify `developing` status for patterns below threshold

2. **Contradiction testing**
   - Create a pattern, then add contradicting session
   - Verify pattern status changes to `needs_review`
   - Test all three resolution options (keep/update/delete)

3. **Cascade deletion testing**
   - Create pattern with 8 sessions
   - Delete sessions one by one
   - Verify confidence decreases
   - Verify `insufficient_evidence` status when < 3 sessions
   - Verify pattern deleted when 0 sessions remain

4. **Settings UI testing**
   - Verify patterns display correctly
   - Verify evidence links work
   - Verify delete action works
   - Verify review badge shows correct count

5. **Edge cases**
   - First session (no patterns)
   - User deletes all sessions (all patterns should be gone)
   - Multiple patterns for same subject (should merge or distinguish)
