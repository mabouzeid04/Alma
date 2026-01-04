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
  first_observed TEXT NOT NULL, -- ISO timestamp
  last_updated TEXT NOT NULL,   -- ISO timestamp
  related_sessions TEXT NOT NULL, -- JSON array of session IDs
  still_relevant INTEGER DEFAULT 1, -- 0 = resolved/faded, 1 = active
  subject TEXT  -- Optional: person name, topic, or question being tracked
);

CREATE INDEX idx_patterns_type ON patterns (pattern_type);
CREATE INDEX idx_patterns_relevant ON patterns (still_relevant);
CREATE INDEX idx_patterns_updated ON patterns (last_updated DESC);
```

### TypeScript Interface

```typescript
interface Pattern {
  id: string;
  patternType: 'emotional_trend' | 'opinion_evolution' | 'relationship' | 'unresolved_question';
  description: string;  // Free-form narrative
  firstObserved: Date;
  lastUpdated: Date;
  relatedSessions: string[];  // Session IDs
  stillRelevant: boolean;
  subject?: string;  // Person name, topic, or question
}
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
[For each pattern: type, description, last updated, related sessions, still_relevant]

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

OUTPUT FORMAT:

Return a JSON object:
{
  "new_patterns": [
    {
      "type": "emotional_trend" | "opinion_evolution" | "relationship" | "unresolved_question",
      "description": "Detailed narrative description of the pattern with specific evidence",
      "subject": "optional - person name, topic, or question",
      "evidence_sessions": ["session_id_1", "session_id_2"]
    }
  ],
  "updated_patterns": [
    {
      "pattern_id": "existing pattern ID",
      "new_description": "Updated narrative incorporating new evidence",
      "add_sessions": ["new session IDs to add"],
      "still_relevant": true | false
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
- Don't create patterns from single mentions. Need 6+ sessions minimum.
- Patterns should reveal something non-obvious - not just "user talked about work."
- For opinion evolution, capture the SHIFT, not just current state.
- If nothing notable, return empty arrays. Don't force patterns.
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

  // Apply changes
  for (const newPattern of result.new_patterns) {
    await createPattern({
      id: uuid(),
      patternType: newPattern.type,
      description: newPattern.description,
      subject: newPattern.subject,
      firstObserved: new Date(),
      lastUpdated: new Date(),
      relatedSessions: newPattern.evidence_sessions,
      stillRelevant: true,
    });
  }

  for (const update of result.updated_patterns) {
    await updatePattern(update.pattern_id, {
      description: update.new_description,
      relatedSessions: [...existing.relatedSessions, ...update.add_sessions],
      stillRelevant: update.still_relevant,
      lastUpdated: new Date(),
    });
  }

  for (const resolved of result.resolved_patterns) {
    await updatePattern(resolved.pattern_id, {
      stillRelevant: false,
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
    `INSERT INTO patterns (id, pattern_type, description, first_observed, last_updated, related_sessions, still_relevant, subject)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pattern.id,
      pattern.patternType,
      pattern.description,
      pattern.firstObserved.toISOString(),
      pattern.lastUpdated.toISOString(),
      JSON.stringify(pattern.relatedSessions),
      pattern.stillRelevant ? 1 : 0,
      pattern.subject ?? null,
    ]
  );
}

export async function updatePattern(id: string, updates: Partial<Pattern>): Promise<void> {
  // Build dynamic UPDATE query based on provided fields
  // ...
}

export async function getAllPatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns ORDER BY last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getActivePatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns WHERE still_relevant = 1 ORDER BY last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getPatternsByType(type: Pattern['patternType']): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns WHERE pattern_type = ? AND still_relevant = 1 ORDER BY last_updated DESC`,
    [type]
  );
  return rows.map(rowToPattern);
}

export async function getPatternsForSession(sessionId: string): Promise<Pattern[]> {
  // Find patterns where related_sessions contains this session ID
  const all = await getAllPatterns();
  return all.filter(p => p.relatedSessions.includes(sessionId));
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
- `app/src/services/patterns.ts` - Pattern detection and management
- `app/src/types/patterns.ts` - Pattern type definitions (or add to existing types/index.ts)

### Modified Files
- `app/src/services/database.ts` - Add patterns table and CRUD operations
- `app/src/services/ai.ts` - Enhance system prompt with patterns
- `app/app/conversation.tsx` - Call pattern detection after session ends
- `app/src/types/index.ts` - Export Pattern type

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

- [ ] Patterns are automatically detected after each session
- [ ] Patterns are stored as rich narratives, not rigid categories
- [ ] Opinion shifts are captured with before/after context
- [ ] Unresolved questions are identified when mentioned 2+ times
- [ ] Relationship patterns track how people are discussed over time
- [ ] Patterns can be marked as resolved when no longer relevant
- [ ] Pattern detection doesn't create noise - only meaningful patterns

---

## Testing Approach

1. **Manual testing with real usage** - Most important
2. **Review generated patterns** - Are they specific? Non-obvious? Accurate?
3. **Edge cases**:
   - First session (no history) - should create no patterns
   - Second session - might create patterns if related to first
   - Pattern resolution - does it correctly mark patterns as resolved?
4. **Performance** - Pattern detection shouldn't significantly slow down session end
