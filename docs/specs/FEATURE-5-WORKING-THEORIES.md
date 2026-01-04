# Feature 5: Working Theories (Long-term Understanding)

## Implementation Order

| Order | Feature | Dependency |
|-------|---------|------------|
| 1 | Pattern Discovery | Foundation - no dependencies |
| 2 | AI-Generated Prompts | Uses patterns |
| 3 | Personalized Conversations | Uses patterns |
| 4 | Enhanced Insights | Uses patterns |
| **5** | **Working Theories** | Builds on all previous features |

---

## Overview

**What**: A layer of deep understanding that develops over months - theories about the user's beliefs, values, and behavioral patterns. Not facts, but hypotheses that the AI develops and refines over time.

**Why**: Some patterns only reveal themselves over long periods. Understanding *why* someone behaves a certain way requires accumulated evidence across many sessions. This is the difference between "you get stressed about work" and "you tie your self-worth to productivity, which is why work stress hits you so hard."

**Core Insight**: These are called "theories" intentionally. They're not facts about the user - they're the AI's working hypotheses that get tested, refined, and sometimes discarded as more evidence accumulates.

---

## Design Philosophy

### Theories, Not Diagnoses

This is not therapy. The AI is not diagnosing the user. It's developing working hypotheses like a thoughtful friend who's been paying attention over time:

**Theory (good):** "You seem to tie your self-worth to being productive. When work is slow, you feel purposeless even if other areas of life are good."

**Diagnosis (bad):** "You exhibit signs of workaholism and may have an unhealthy attachment to external validation."

### Humble and Revisable

Theories are explicitly uncertain. They should be framed as observations, not conclusions:

- "I've started to notice..." not "You are..."
- "This might explain..." not "This is why..."
- "I could be wrong, but..." not "Clearly..."

### Tested Through Exploration

The AI doesn't just develop theories - it tests them through:
- Generated prompts that explore the theory
- Questions during conversations that probe gently
- Watching for confirming or contradicting evidence

### Evolving Over Time

Theories have confidence levels that change:
- **Developing** (0.3-0.5) - Just starting to notice something
- **Emerging** (0.5-0.7) - Pattern is clearer, but needs more evidence
- **Confident** (0.7-0.9) - Strong evidence across many sessions
- **Questioning** - New evidence contradicts the theory

---

## What Theories Look Like

### Example Theories

**Theory 1: Self-worth tied to productivity**
```
You seem to tie your sense of self-worth closely to being productive. When
work is busy and you're accomplishing things, you feel good about yourself.
When it's slow or you're "just" relaxing, you feel guilty or purposeless -
even if other parts of life are going well.

Confidence: 0.72 (Confident)
First noticed: 3 months ago
Evidence: 12 sessions
Last evaluated: 2 days ago

Supporting evidence:
- "I feel useless when I'm not doing something productive"
- Guilt about taking weekends off comes up repeatedly
- Vacation planning triggers anxiety about "wasting time"
- Self-criticism spikes during slower work periods
```

**Theory 2: Conflict avoidance in relationships**
```
You tend to avoid difficult conversations in relationships, preferring to
let things slide or handle frustrations internally rather than bringing
them up. This might work short-term but seems to lead to resentment
building up over time.

Confidence: 0.58 (Emerging)
First noticed: 2 months ago
Evidence: 7 sessions
Last evaluated: 1 week ago

Supporting evidence:
- Multiple mentions of "I should talk to them about this but..."
- Frustrations about Sarah often mentioned after the fact
- Pattern of "it's fine" followed by venting later
```

**Theory 3: Authority figure dynamics (Questioning)**
```
I had a theory that you have complicated feelings about authority figures,
but recent sessions have shown a more nuanced picture. Your relationship
with your manager has actually improved, and you've been more direct with
professors. I'm revising this theory.

Confidence: 0.35 (Questioning)
Status: Under revision
```

---

## Data Model

### Theories Table

```sql
CREATE TABLE theories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,                    -- Short title
  description TEXT NOT NULL,              -- Full narrative description
  theory_type TEXT NOT NULL,              -- 'belief' | 'value' | 'behavior' | 'dynamic' | 'root_cause'
  confidence REAL NOT NULL DEFAULT 0.3,   -- 0.0 to 1.0
  status TEXT NOT NULL DEFAULT 'developing', -- 'developing' | 'emerging' | 'confident' | 'questioning' | 'revised' | 'discarded'
  first_observed TEXT NOT NULL,           -- ISO timestamp
  last_evaluated TEXT NOT NULL,           -- ISO timestamp
  evidence_sessions TEXT NOT NULL,        -- JSON array of session IDs
  evidence_quotes TEXT,                   -- JSON array of supporting quotes
  counter_evidence TEXT,                  -- JSON array of contradicting observations
  related_patterns TEXT,                  -- JSON array of pattern IDs that support this
  exploration_prompts TEXT,               -- JSON array of prompt IDs generated to test this
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_theories_status ON theories (status);
CREATE INDEX idx_theories_confidence ON theories (confidence DESC);
CREATE INDEX idx_theories_updated ON theories (updated_at DESC);
```

### TypeScript Interface

```typescript
interface Theory {
  id: string;
  title: string;                          // "Self-worth tied to productivity"
  description: string;                    // Full narrative
  theoryType: 'belief' | 'value' | 'behavior' | 'dynamic' | 'root_cause';
  confidence: number;                     // 0.0 to 1.0
  status: 'developing' | 'emerging' | 'confident' | 'questioning' | 'revised' | 'discarded';
  firstObserved: Date;
  lastEvaluated: Date;
  evidenceSessions: string[];             // Session IDs
  evidenceQuotes: string[];               // Supporting quotes
  counterEvidence?: string[];             // Contradicting observations
  relatedPatterns: string[];              // Pattern IDs
  explorationPrompts: string[];           // Prompt IDs generated to test this
  createdAt: Date;
  updatedAt: Date;
}

type TheoryType =
  | 'belief'      // Core beliefs about self, world, others
  | 'value'       // What matters to them
  | 'behavior'    // Recurring behavioral patterns
  | 'dynamic'     // Relationship or situational dynamics
  | 'root_cause'; // Why they do/feel certain things
```

---

## Theory Lifecycle

### 1. Emergence

Theories emerge from accumulated patterns. When Pattern Discovery (Feature 2) notices the same theme appearing across many sessions over weeks/months, it can trigger theory formation.

```typescript
async function checkForTheoryEmergence(): Promise<void> {
  // Get patterns that have been active for 4+ weeks with 6+ sessions
  const maturePatterns = await getMaturePattterns({
    minAge: 28,        // days
    minSessions: 6,
  });

  // Check if any cluster of patterns suggests a deeper theory
  for (const patternCluster of clusterRelatedPatterns(maturePatterns)) {
    const existingTheory = await findRelatedTheory(patternCluster);

    if (existingTheory) {
      // Update existing theory with new evidence
      await updateTheoryEvidence(existingTheory, patternCluster);
    } else {
      // Check if this warrants a new theory
      const shouldCreateTheory = await evaluateTheoryPotential(patternCluster);
      if (shouldCreateTheory) {
        await generateNewTheory(patternCluster);
      }
    }
  }
}
```

### 2. Development

New theories start with low confidence and "developing" status:

```typescript
async function generateNewTheory(patterns: Pattern[]): Promise<Theory> {
  const prompt = buildTheoryGenerationPrompt(patterns);
  const response = await runPromptWithModel(prompt, modelPref);

  const theory: Theory = {
    id: uuid(),
    title: response.title,
    description: response.description,
    theoryType: response.type,
    confidence: 0.35,  // Start low
    status: 'developing',
    firstObserved: new Date(),
    lastEvaluated: new Date(),
    evidenceSessions: extractSessionIds(patterns),
    evidenceQuotes: response.quotes,
    relatedPatterns: patterns.map(p => p.id),
    explorationPrompts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await saveTheory(theory);

  // Generate a prompt to explore this theory
  await generateTheoryExplorationPrompt(theory);

  return theory;
}
```

### 3. Testing

Theories are tested through:

**A. Generated Prompts**
```typescript
async function generateTheoryExplorationPrompt(theory: Theory): Promise<Prompt> {
  const prompt = await createPrompt({
    question: generateExplorationQuestion(theory),
    context: `I've been developing a theory about you: "${theory.title}". This question helps me understand if I'm on the right track.`,
    sourceTheoryId: theory.id,
  });

  // Link prompt to theory
  await updateTheory(theory.id, {
    explorationPrompts: [...theory.explorationPrompts, prompt.id],
  });

  return prompt;
}

function generateExplorationQuestion(theory: Theory): string {
  // Generate a question that tests the theory without leading
  // Examples:
  // Theory: "Self-worth tied to productivity"
  // Question: "When you have a slow day at work, how does that affect how you feel about yourself?"

  // Theory: "Conflict avoidance in relationships"
  // Question: "When something bothers you about Sarah, what usually happens? Do you bring it up or let it go?"
}
```

**B. Conversation Context**
When a theory is relevant to the current conversation, it's included in the AI's context:

```typescript
// In buildSystemPrompt():
if (relevantTheories.length > 0) {
  prompt += `\n\nWORKING THEORIES (test gently, don't state directly):`;
  for (const theory of relevantTheories) {
    prompt += `\n- ${theory.title} (confidence: ${theory.confidence.toFixed(1)})`;
    prompt += `\n  ${theory.description}`;
    prompt += `\n  If relevant, gently probe this. Don't tell them the theory directly.`;
  }
}
```

### 4. Evaluation

After sessions that touch on a theory, re-evaluate:

```typescript
async function evaluateTheoryAfterSession(
  session: JournalSession,
  theory: Theory
): Promise<void> {
  const prompt = buildTheoryEvaluationPrompt(theory, session);
  const evaluation = await runPromptWithModel(prompt, modelPref);

  // Update theory based on evaluation
  let newConfidence = theory.confidence;
  let newStatus = theory.status;

  if (evaluation.supports) {
    newConfidence = Math.min(0.95, theory.confidence + 0.05);
    if (newConfidence > 0.7) newStatus = 'confident';
    else if (newConfidence > 0.5) newStatus = 'emerging';
  } else if (evaluation.contradicts) {
    newConfidence = Math.max(0.1, theory.confidence - 0.1);
    if (newConfidence < 0.4) newStatus = 'questioning';
  }

  await updateTheory(theory.id, {
    confidence: newConfidence,
    status: newStatus,
    lastEvaluated: new Date(),
    evidenceSessions: evaluation.supports
      ? [...theory.evidenceSessions, session.id]
      : theory.evidenceSessions,
    evidenceQuotes: evaluation.newQuotes
      ? [...theory.evidenceQuotes, ...evaluation.newQuotes]
      : theory.evidenceQuotes,
    counterEvidence: evaluation.contradicts
      ? [...(theory.counterEvidence || []), evaluation.counterNote]
      : theory.counterEvidence,
  });
}
```

### 5. Revision or Retirement

Theories can be revised or discarded:

```typescript
// When counter-evidence accumulates
if (theory.counterEvidence.length >= 3 && theory.confidence < 0.4) {
  await updateTheory(theory.id, {
    status: 'discarded',
  });
}

// When theory needs revision
if (needsRevision(theory)) {
  const revisedTheory = await reviseTheory(theory);
  await updateTheory(theory.id, {
    status: 'revised',
  });
  await saveTheory(revisedTheory); // New theory with reference to old
}
```

---

## LLM Prompts

### Theory Generation Prompt

```
You are developing a "working theory" about a user based on patterns observed
across many journal sessions over several weeks or months.

A working theory is NOT a diagnosis or label. It's a hypothesis about:
- A core belief they hold about themselves or the world
- A value that drives their decisions
- A behavioral pattern and what might be behind it
- A dynamic in their relationships
- A root cause for recurring feelings or behaviors

═══════════════════════════════════════════════════════════════════════════════
PATTERNS OBSERVED (across ${sessionCount} sessions over ${timeSpan})
═══════════════════════════════════════════════════════════════════════════════

${formattedPatterns}

═══════════════════════════════════════════════════════════════════════════════
RELEVANT SESSION EXCERPTS
═══════════════════════════════════════════════════════════════════════════════

${relevantQuotes}

═══════════════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════════════

Based on these patterns, develop a working theory. This should be:

1. DEEPER than surface patterns - not "they get stressed at work" but WHY
2. HUMBLE - framed as a hypothesis, not a conclusion
3. SPECIFIC to this person - based on their actual words and patterns
4. TESTABLE - we should be able to probe this in future conversations
5. USEFUL - understanding this would help the AI be a better friend

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "shouldCreateTheory": true/false,
  "theory": {
    "title": "Short descriptive title (5-10 words)",
    "description": "2-4 sentences describing the theory. Frame it humbly: 'You seem to...', 'I've noticed that...', 'This might explain...'",
    "type": "belief" | "value" | "behavior" | "dynamic" | "root_cause",
    "quotes": ["direct quotes from sessions that support this"],
    "explorationQuestion": "A question that would help test this theory"
  },
  "reasoning": "Why this rises to the level of a theory vs just a pattern"
}

Only create a theory if there's genuine depth here. Not every pattern cluster
warrants a theory. Return shouldCreateTheory: false if this is surface-level.
```

### Theory Evaluation Prompt

```
You are evaluating whether a recent journal session supports, contradicts,
or is neutral toward an existing theory about the user.

═══════════════════════════════════════════════════════════════════════════════
THE THEORY
═══════════════════════════════════════════════════════════════════════════════

Title: ${theory.title}
Description: ${theory.description}
Current confidence: ${theory.confidence}
Evidence so far: ${theory.evidenceQuotes.length} supporting quotes

═══════════════════════════════════════════════════════════════════════════════
NEW SESSION
═══════════════════════════════════════════════════════════════════════════════

${sessionTranscript}

═══════════════════════════════════════════════════════════════════════════════
EVALUATION
═══════════════════════════════════════════════════════════════════════════════

Does this session:
1. SUPPORT the theory (provides new evidence)?
2. CONTRADICT the theory (shows behavior/thinking opposite to the theory)?
3. NEUTRAL (doesn't touch on this theory)?

Return JSON:
{
  "verdict": "supports" | "contradicts" | "neutral",
  "reasoning": "Brief explanation",
  "newQuotes": ["relevant quotes if supports"],
  "counterNote": "what contradicts the theory if applicable"
}

Be rigorous. Only mark as "supports" if there's clear new evidence.
Don't stretch interpretations to fit the theory.
```

---

## UI Display

### Theories in Insights Screen

Theories appear in a dedicated section of the Insights screen:

```
┌─────────────────────────────────────────────────────────────┐
│  Deeper patterns I've noticed                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🧠 Self-worth tied to productivity                     ││
│  │                                                         ││
│  │ You seem to tie your sense of self-worth closely to    ││
│  │ being productive. When work is busy, you feel good.    ││
│  │ When it's slow, you feel guilty - even if other parts  ││
│  │ of life are going well.                                ││
│  │                                                         ││
│  │ ████████████░░░░ 72% confident                         ││
│  │ Based on 12 sessions over 3 months                      ││
│  │                                                         ││
│  │ [Explore this →]                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💭 Conflict avoidance in relationships                 ││
│  │                                                         ││
│  │ I'm starting to notice that you tend to let things     ││
│  │ slide rather than bringing them up directly. This      ││
│  │ might lead to frustration building up over time.       ││
│  │                                                         ││
│  │ ████████░░░░░░░░ 58% confident                         ││
│  │ Still developing · 7 sessions                           ││
│  │                                                         ││
│  │ [Help me understand this better →]                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Theory Detail View

Tapping a theory shows full detail:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Self-worth tied to productivity                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You seem to tie your sense of self-worth closely to       │
│  being productive. When work is busy and you're            │
│  accomplishing things, you feel good about yourself.       │
│  When it's slow or you're "just" relaxing, you feel        │
│  guilty or purposeless - even if other parts of life       │
│  are going well.                                           │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ████████████░░░░ 72% confident                            │
│  First noticed 3 months ago · 12 sessions                   │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Supporting evidence                                        │
│                                                             │
│  "I feel useless when I'm not doing something productive"  │
│  Nov 10                                                     │
│                                                             │
│  "I know I should relax but I just feel guilty about it"   │
│  Oct 28                                                     │
│                                                             │
│  "Weekends where I don't accomplish anything feel wasted"  │
│  Oct 15                                                     │
│                                                             │
│  ... 9 more                                                 │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  [Explore this in a conversation →]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Confidence Visualization

```typescript
function ConfidenceBar({ confidence, status }: { confidence: number; status: string }) {
  const segments = 16;
  const filled = Math.round(confidence * segments);

  const getColor = () => {
    if (status === 'questioning') return colors.warning;
    if (confidence >= 0.7) return colors.success;
    if (confidence >= 0.5) return colors.primary;
    return colors.textSecondary;
  };

  return (
    <View style={styles.confidenceContainer}>
      <View style={styles.confidenceBar}>
        {Array(segments).fill(0).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < filled && { backgroundColor: getColor() },
            ]}
          />
        ))}
      </View>
      <Text style={styles.confidenceText}>
        {Math.round(confidence * 100)}% confident
      </Text>
    </View>
  );
}
```

---

## Integration Points

### 1. Pattern Discovery → Theory Emergence

When patterns mature (4+ weeks, 6+ sessions), check for theory emergence:

```typescript
// In detectAndUpdatePatterns():
await checkForTheoryEmergence();
```

### 2. Conversation Context

Relevant theories inform how the AI responds:

```typescript
// In buildSystemPrompt():
const relevantTheories = await getTheoriesForContext(currentMessage);
// Include in system prompt with guidance to probe gently
```

### 3. Prompts Generation

Theories generate exploration prompts:

```typescript
// When theory is created or needs testing:
await generateTheoryExplorationPrompt(theory);
```

### 4. Insights Display

Theories appear in Insights under "Deeper patterns":

```typescript
// In insights.tsx:
const theories = await getDisplayableTheories();
// Render in dedicated section
```

### 5. Session End Evaluation

After each session, evaluate relevant theories:

```typescript
// In processSessionMemory():
const relevantTheories = await getTheoriesForSession(session);
for (const theory of relevantTheories) {
  await evaluateTheoryAfterSession(session, theory);
}
```

---

## Files to Create/Modify

### New Files

- `app/src/services/theories.ts` - Theory generation, evaluation, lifecycle
- `app/src/components/TheoryCard.tsx` - Theory display card
- `app/src/components/TheoryDetail.tsx` - Full theory detail view
- `app/src/components/ConfidenceBar.tsx` - Confidence visualization

### Modified Files

- `app/src/services/database.ts` - Add theories table and CRUD
- `app/src/services/ai.ts` - Include theories in system prompt
- `app/src/services/patterns.ts` - Trigger theory emergence check
- `app/src/services/prompts.ts` - Generate theory exploration prompts
- `app/app/insights.tsx` - Display theories section
- `app/src/hooks/useSession.ts` - Evaluate theories after session
- `app/src/types/index.ts` - Theory type definitions

---

## Example Theories

### Belief Type
```json
{
  "title": "Self-worth tied to productivity",
  "description": "You seem to tie your sense of self-worth closely to being productive. When work is busy, you feel good. When it's slow or you're relaxing, you feel guilty - even if other parts of life are going well.",
  "theoryType": "belief",
  "confidence": 0.72,
  "status": "confident"
}
```

### Value Type
```json
{
  "title": "Independence matters deeply",
  "description": "You value independence and autonomy highly. When you feel controlled or constrained - whether at work or in relationships - you become restless. Making your own choices seems essential to your wellbeing.",
  "theoryType": "value",
  "confidence": 0.65,
  "status": "emerging"
}
```

### Behavior Type
```json
{
  "title": "Conflict avoidance pattern",
  "description": "You tend to let things slide rather than bringing them up directly. Small frustrations get internalized rather than discussed, which might lead to resentment building up over time.",
  "theoryType": "behavior",
  "confidence": 0.58,
  "status": "emerging"
}
```

### Dynamic Type
```json
{
  "title": "Authority figure sensitivity",
  "description": "Your relationship with authority figures - managers, professors, even parents - seems complicated. You want their approval but also chafe at being directed. This push-pull creates stress.",
  "theoryType": "dynamic",
  "confidence": 0.45,
  "status": "developing"
}
```

### Root Cause Type
```json
{
  "title": "Fear of disappointing others",
  "description": "Many of your stress responses - overworking, avoiding difficult conversations, anxiety about performance - might stem from a deep fear of disappointing people you care about or respect.",
  "theoryType": "root_cause",
  "confidence": 0.52,
  "status": "emerging"
}
```

---

## Success Criteria

After implementation:

- [ ] Theories emerge naturally from accumulated patterns (not forced)
- [ ] Theories feel like insights, not diagnoses
- [ ] Confidence levels update based on evidence
- [ ] Theories inform AI conversation naturally
- [ ] Exploration prompts test theories without leading
- [ ] Users can view and understand theories about themselves
- [ ] Theories can be revised or discarded when wrong

---

## Testing Approach

1. **Theory quality** - Do they feel insightful and specific?
2. **Confidence accuracy** - Does confidence reflect actual evidence?
3. **Evolution** - Do theories update appropriately with new sessions?
4. **Integration** - Do theories inform conversations naturally?
5. **Edge cases**:
   - New user (no theories yet) - graceful empty state
   - Contradicting evidence - theory should be questioned
   - Similar patterns - shouldn't create duplicate theories
6. **Tone check** - Humble and exploratory, not clinical or diagnostic

---

## Implementation Notes

### Start Simple

For initial implementation:
1. Manual trigger for theory generation (not automatic)
2. Basic confidence scoring
3. Display in Insights only
4. Simple evaluation after sessions

### Future Enhancements

Later iterations could add:
- Automatic theory emergence from pattern clusters
- More sophisticated confidence algorithms
- Theory connections and hierarchies
- User feedback on theory accuracy
- Theory-driven conversation strategies
