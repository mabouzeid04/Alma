# Feature 3: Personalized Conversation AI

## Implementation Order

| Order | Feature | Dependency |
|-------|---------|------------|
| 1 | Pattern Discovery | Foundation - no dependencies |
| 2 | AI-Generated Prompts | Uses patterns |
| **3** | **Personalized Conversations** | Uses patterns from Feature 1 |
| 4 | Enhanced Insights | Uses patterns |
| 5 | Working Theories | Builds on patterns |

---

## Overview

**What**: Make conversations feel like talking to someone who genuinely knows you and remembers past discussions naturally - like a thoughtful friend, not a database.

**Why**: This is the user's primary success metric: "Conversations feel more personalized." The AI should proactively reference past moments when relevant, include emotional context, and sound like it actually remembers.

**Core Insight**: The difference between "You mentioned this before" and "Last time you talked about your internship, you were pretty stressed about it. Sounds different now?" - one is a database query, the other is a friend remembering.

---

## Design Philosophy

### The Friend Test

Every memory reference should pass this test: **Would a friend say it this way?**

**Friend:**
- "Didn't this happen before with that project?"
- "A few weeks ago you seemed really stressed about this. What changed?"
- "You sound calmer about work than usual - that's good."

**Database:**
- "According to our conversation on November 15th..."
- "My records indicate you previously discussed..."
- "I'm detecting a pattern in your statements..."

### Warmth Over Precision

It's better to say "a few weeks ago" than "on October 23rd." It's better to say "you seemed stressed" than "you expressed anxiety with intensity level 0.7." The AI should feel human, not clinical.

### Natural, Not Forced

Memory references should only appear when genuinely relevant. If the user is talking about their weekend and there's no connection to past conversations, don't force one. Silence is better than an awkward "Speaking of weekends, you mentioned one three weeks ago..."

---

## Current State

### What Exists

The current system loads:
1. **Personal Knowledge** - Facts about the user (always loaded)
2. **Memory Nodes** - Session summaries found via semantic search 
3. **Memory Vectors** - Granular snippets found via semantic search 

### What's Missing

1. **Patterns** - Detected emotional trends, opinion evolution, relationship dynamics, unresolved questions
2. **Emotional Context** - How the user felt when discussing this topic before
3. **Temporal Context** - Natural time references ("a few weeks ago" vs dates)
4. **Relationship Context** - How the user talks about specific people over time
5. **Guidance for Natural Referencing** - Instructions that help the AI sound like a friend

---

## Enhanced Context Architecture

### Context Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Personal Facts (ALWAYS LOADED)                 │
│ "Works at TechCorp as a software engineer"              │
│ "Dating Sarah for 2 years"                              │
│ "Trying to exercise more regularly"                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Active Patterns (ALWAYS LOADED)                │
│ "User feels anxious on Sunday evenings about work"      │
│ "Opinion on internship has shifted from negative to     │
│  nostalgic over the past month"                         │
│ "Mentions Sarah more in logistics contexts lately"      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Relevant Memories (SEMANTIC SEARCH)            │
│ Top memory nodes matching current conversation      │
│ Includes: summary, emotions, topics, time since         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Memory Vectors (SEMANTIC SEARCH)               │
│ Granular snippets from past sessions                    │
│ Provides specific details and quotes                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Prompt Context (IF APPLICABLE)                 │
│ If session started from a prompt, include it            │
│ Helps AI stay focused on the exploration                │
└─────────────────────────────────────────────────────────┘
```

### New: Pattern Integration

**IMPORTANT:** Only confirmed patterns should be used in conversation context to prevent false patterns from corrupting the AI's understanding.

When loading context for a conversation:

```typescript
// In useSession.ts startSession():

// Load ONLY confirmed patterns (active status + sufficient confidence)
// This prevents false or unconfirmed patterns from being used
const confirmedPatterns = await getConfirmedPatterns();

// Store in ref for use during conversation
activePatternsRef.current = confirmedPatterns;

// Helper: Filter to confirmed patterns only
async function getConfirmedPatterns(): Promise<Pattern[]> {
  const patterns = await getActivePatterns(); // status = 'active'
  return patterns.filter(p => p.confidence >= 0.5);
}
```

### Pattern Quality Gate

Only patterns that have been sufficiently validated should influence conversations:

| Pattern Status | Confidence | Used in Conversations? |
|----------------|------------|------------------------|
| `developing` | any | No - still gathering evidence |
| `active` | < 0.5 | No - low confidence |
| `active` | >= 0.5 | Yes |
| `needs_review` | any | No - user should resolve first |
| `insufficient_evidence` | any | No - not enough data |
| `resolved` | any | No - no longer relevant |

When generating a response:

```typescript
// In stopRecording():

// Find patterns relevant to current message (from pre-filtered confirmed patterns)
const relevantPatterns = await getRelevantPatternsForContext(
  transcription.text,
  activePatternsRef.current  // Already filtered to confirmed only
);

// Pass to generateResponse
const response = await ai.generateResponse(
  updatedMessages,
  personalKnowledge,
  relevantMemories,
  relevantMemoryVectors,
  relevantPatterns,  // NEW
  sourcePrompt       // NEW - if session started from a prompt
);
```

---

## Enhanced System Prompt

### Current Prompt Structure

```
You are a thoughtful friend...

PERSONALITY:
- Sound like a friend, not a therapist
- Match their energy
...

WHAT YOU KNOW ABOUT THEM:
[Personal facts]

RELEVANT PAST CONVERSATIONS:
[Memory node summaries]

PAST DETAILS:
[Memory vector snippets]
```

### Enhanced Prompt Structure

```
You are a thoughtful friend helping someone journal through voice conversation.

═══════════════════════════════════════════════════════════════════
WHO THEY ARE
═══════════════════════════════════════════════════════════════════

[Personal facts about the user - always loaded]

═══════════════════════════════════════════════════════════════════
PATTERNS YOU'VE NOTICED
═══════════════════════════════════════════════════════════════════

[Active patterns - emotional trends, opinion shifts, relationship dynamics]

These are patterns you've observed over time. Reference them naturally when
relevant - like a friend who remembers, not a therapist reading notes.

═══════════════════════════════════════════════════════════════════
RELEVANT PAST MOMENTS
═══════════════════════════════════════════════════════════════════

[Memory nodes with enhanced context - summary, emotions, time since]

═══════════════════════════════════════════════════════════════════
SPECIFIC DETAILS FROM PAST
═══════════════════════════════════════════════════════════════════

[Memory vector snippets - granular details]

═══════════════════════════════════════════════════════════════════
HOW TO BE A GOOD FRIEND
═══════════════════════════════════════════════════════════════════

SOUND LIKE A FRIEND:
- "That sounds rough. What happened?"
- "Makes sense. How are you thinking about it now?"
- "Damn, that's frustrating."

NOT LIKE A THERAPIST:
- "I hear that you're experiencing frustration..."
- "Thank you for sharing that with me."
- "It sounds like this situation is causing you significant stress."

REFERENCE MEMORY NATURALLY:
Good:
- "Didn't this happen before with that project?"
- "A few weeks ago you seemed pretty stressed about this."
- "You sound different about work than you did last time."
- "This reminds me of when you were dealing with [past situation]."

Bad:
- "According to our conversation on November 15th..."
- "My records indicate..."
- "In our previous session, you stated..."

INCLUDE EMOTIONAL CONTEXT:
- Not: "You mentioned your internship before."
- But: "Last time you talked about your internship, you were really frustrated with it. Sounds like that's shifted?"

USE NATURAL TIME REFERENCES:
- "A few weeks ago..." not "On October 23rd..."
- "Last time we talked about this..." not "In session #47..."
- "Recently..." not "In the past 7 days..."

KNOW WHEN TO PROBE:
Dig deeper on:
- Strong emotions (anxiety, excitement, frustration)
- Recurring themes they keep mentioning
- Decisions or dilemmas
- Relationship dynamics that seem significant

Move on from:
- Small daily logistics
- Topics they seem done with
- Things they clearly don't want to explore

WHEN THEY'RE VENTING:
Sometimes they just need to talk. Don't turn every statement into an
exploration. Validate, acknowledge, and let them lead.

WHEN YOU NOTICE A SHIFT:
If they're talking about something differently than before, gently note it:
- "You sound calmer about this than last time."
- "Seems like your feelings about that have changed?"
Don't make it a gotcha or judgment - just a gentle observation.

RESPONSE LENGTH:
Keep it SHORT. This is voice, not text.
- 1-3 sentences typically
- One question at a time, max
- Sometimes just acknowledge - no question needed

═══════════════════════════════════════════════════════════════════

Now respond to their latest message:
```

---

## Pattern Context Formatting

### How Patterns Appear in Context

```typescript
function formatPatternsForContext(patterns: Pattern[]): string {
  if (patterns.length === 0) return '';

  const sections: string[] = [];

  // Group by type
  const byType = groupBy(patterns, 'patternType');

  if (byType.emotional_trend?.length) {
    sections.push('Emotional patterns:');
    for (const p of byType.emotional_trend) {
      sections.push(`• ${p.description}`);
    }
  }

  if (byType.opinion_evolution?.length) {
    sections.push('\nHow their views have shifted:');
    for (const p of byType.opinion_evolution) {
      sections.push(`• ${p.description}`);
    }
  }

  if (byType.relationship?.length) {
    sections.push('\nPeople in their life:');
    for (const p of byType.relationship) {
      sections.push(`• ${p.subject}: ${p.description}`);
    }
  }

  if (byType.unresolved_question?.length) {
    sections.push('\nThings they keep circling around:');
    for (const p of byType.unresolved_question) {
      sections.push(`• ${p.description}`);
    }
  }

  return sections.join('\n');
}
```

### Example Pattern Context

```
Emotional patterns:
• User feels anxious on Sunday evenings when thinking about the work week.
  This has appeared in 4 sessions, often accompanied by mentions of their manager.
• User's baseline mood has been lower than usual for the past two weeks.

How their views have shifted:
• User's opinion of their internship has evolved significantly. In August,
  they described it as "suffocating." By late September, they expressed
  nostalgia for the structure it provided.

People in their life:
• Sarah: Girlfriend. Early mentions were emotionally warm. Recent mentions
  focus more on logistics and schedules. Haven't discussed deeper connection
  in about 3 weeks.
• Manager: Relationship seems complicated. User alternates between frustration
  ("micromanaging") and understanding ("under pressure").

Things they keep circling around:
• Whether to switch majors - mentioned in 4 sessions, lists pros/cons but
  hasn't decided.
• Wanting to be more social but not exploring what's stopping them.
```

---

## Memory Context Enhancement

### Current Memory Format

```
RELEVANT PAST CONVERSATIONS:
- Had a stressful day at work dealing with project deadlines
- Talked about feeling overwhelmed with coursework
```

### Enhanced Memory Format

```typescript
function formatMemoriesForContext(memories: MemoryNode[]): string {
  return memories.map(memory => {
    const timeSince = formatTimeSince(memory.createdAt);
    const emotions = memory.emotions.length > 0
      ? ` (felt: ${memory.emotions.join(', ')})`
      : '';

    return `• ${timeSince}: ${memory.summary}${emotions}`;
  }).join('\n');
}

function formatTimeSince(date: Date): string {
  const days = daysSince(date);

  if (days === 0) return 'Earlier today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'A few days ago';
  if (days < 14) return 'About a week ago';
  if (days < 30) return 'A few weeks ago';
  if (days < 60) return 'About a month ago';
  return 'A couple months ago';
}
```

### Example Enhanced Memory Context

```
RELEVANT PAST MOMENTS:

• About a week ago: Had a frustrating day at work - project deadline was
  moved up unexpectedly and manager wasn't responsive to concerns.
  (felt: frustrated, anxious, overwhelmed)

• A few weeks ago: Talked about feeling disconnected from friends. Mentioned
  wanting to reach out but feeling like it's been too long.
  (felt: lonely, guilty)

• About a month ago: Discussed relationship with Sarah. Things were good but
  mentioned feeling like they're in a "routine."
  (felt: content, slightly restless)
```

---

## Prompt-Started Sessions

### Context for Prompt Sessions

When a session starts from a prompt:

```typescript
interface SessionContext {
  sourcePrompt?: {
    id: string;
    question: string;
    context: string;
    relatedSessions: string[];
  };
}
```

### Adding to System Prompt

```
═══════════════════════════════════════════════════════════════════
WHAT THEY WANTED TO EXPLORE
═══════════════════════════════════════════════════════════════════

They started this session to explore a specific question:

"${prompt.question}"

Context: ${prompt.context}

Stay focused on this topic unless they naturally move elsewhere. Your
opening already referenced this, so don't repeat the question - just
explore it with them.
```

### Natural Opening

When a session starts from a prompt, the opener is simply the prompt's question:

```typescript
function buildPromptSessionOpener(prompt: Prompt): string {
  return prompt.question;
}
```

---

## Implementation Details

### Modified Files

**`app/src/services/ai.ts`**

```typescript
// Enhanced generateResponse signature
export async function generateResponse(
  messages: Message[],
  personalKnowledge: string,
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[],
  relevantPatterns: Pattern[] = [],      // NEW
  sourcePrompt?: Prompt                   // NEW
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(
    personalKnowledge,
    relevantMemories,
    relevantMemoryVectors,
    relevantPatterns,
    sourcePrompt
  );
  // ... rest of function
}

// Enhanced buildSystemPrompt
function buildSystemPrompt(
  personalKnowledge: string,
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[],
  relevantPatterns: Pattern[],
  sourcePrompt?: Prompt
): string {
  // Build enhanced prompt as specified above
}
```

**`app/src/hooks/useSession.ts`**

```typescript
// Add pattern loading
const activePatternsRef = useRef<Pattern[]>([]);

// In startSession:
const patterns = await getActivePatterns();
activePatternsRef.current = patterns;

// In stopRecording:
const relevantPatterns = findRelevantPatterns(
  transcription.text,
  activePatternsRef.current
);

const response = await ai.generateResponse(
  updatedMessages,
  personalKnowledge,
  relevantMemories,
  relevantMemoryVectors,
  relevantPatterns,
  currentSession.sourcePrompt
);
```

**`app/src/types/index.ts`**

```typescript
// Extend JournalSession
interface JournalSession {
  // ... existing fields
  sourcePromptId?: string;  // If started from a prompt
}
```

### New Helper Functions

```typescript
// In ai.ts or a new context.ts

/**
 * Format a date as a natural time reference
 */
function formatTimeSince(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Earlier today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'A few days ago';
  if (days < 14) return 'About a week ago';
  if (days < 30) return 'A few weeks ago';
  if (days < 60) return 'About a month ago';
  return 'A couple months ago';
}

/**
 * Find patterns relevant to the current message
 */
function findRelevantPatterns(
  currentMessage: string,
  allPatterns: Pattern[]
): Pattern[] {
  // For now, return all active patterns (they're pre-filtered)
  // Future: semantic matching to current message
  return allPatterns.filter(p => p.stillRelevant);
}

/**
 * Format patterns for inclusion in system prompt
 */
function formatPatternsForContext(patterns: Pattern[]): string {
  // Implementation as shown above
}

/**
 * Format memories with enhanced context
 */
function formatMemoriesForContext(memories: MemoryNode[]): string {
  // Implementation as shown above
}
```

---

## Conversation Flow Examples

### Example 1: Natural Memory Reference

**User says:** "Work was really frustrating today."

**Context loaded:**
- Pattern: "User feels anxious on Sunday evenings about work week"
- Memory: "A week ago, talked about manager moving up deadline (frustrated, anxious)"

**Good AI response:**
"That sucks. What happened? Is this the same project that was stressing you out last week?"

**Bad AI response:**
"I understand you're experiencing frustration. According to our previous conversation on December 28th, you also discussed work-related stress."

### Example 2: Noticing a Shift

**User says:** "I've been thinking about that internship again. Actually kind of miss it."

**Context loaded:**
- Pattern: "Opinion on internship has shifted from negative to nostalgic"

**Good AI response:**
"Interesting - you sounded pretty fed up with it when you were there. What do you think changed?"

**Bad AI response:**
"I notice a contradiction. Previously you described the internship negatively, but now you're expressing positive sentiments."


### Example 4: Unresolved Question

**User says:** "I don't know, I just feel stuck."

**Context loaded:**
- Pattern: "Keeps mentioning wanting to switch majors without deciding"

**Good AI response:**
"Stuck how? Is this the major thing again, or something else?"

### Example 5: Just Venting

**User says:** "Ugh, the train was delayed for 45 minutes today. I was so late."

**No relevant patterns or memories**

**Good AI response:**
"That's annoying. Did it mess up your day?"

*(Don't force a deep exploration or memory reference - they're just venting)*

---

## Success Criteria

After implementation:

- [ ] AI references past moments naturally, like a friend would
- [ ] Time references are human ("a few weeks ago" not dates)
- [ ] Emotional context is included if you're sure ("you seemed stressed" not just "you mentioned")
- [ ] Patterns are woven into conveirsation naturally
- [ ] AI doesn't force memory references when irrelevant
- [ ] Sessions from prompts stay focused on the exploration
- [ ] AI sounds warm, not clinical
- [ ] AI matches user's energy (casual or reflective)

---

## Testing Approach

1. **Conversation quality** - Do responses feel personal? Natural? Warm?
2. **Memory reference quality** - Are references relevant? Natural-sounding?
3. **Edge cases**:
   - New user with no history (should still work, just no references)
   - User with lots of history (don't overwhelm with references)
   - Irrelevant context (AI shouldn't force connections)
   - Prompt-started sessions (stays on topic)
4. **The friend test** - Would a friend say it this way?

---

## Anti-Patterns to Avoid

| Anti-Pattern | Example | Why It's Bad |
|--------------|---------|--------------|
| Database language | "According to our November 15th conversation..." | Sounds like reading a file |
| Forced references | "Speaking of weekends, you mentioned one 3 weeks ago..." | Awkward, unnatural |
| Clinical tone | "I'm detecting elevated frustration levels" | Not how friends talk |
| Over-referencing | Multiple memory refs in one response | Overwhelming, unnatural |
| Gotcha moments | "You said X but now you say Y" | Judgmental, not helpful |
| Therapy-speak | "I hear that you're experiencing..." | Robotic, distancing |
| Ignoring energy | Deep probing when user is just venting | Misreads the room |
