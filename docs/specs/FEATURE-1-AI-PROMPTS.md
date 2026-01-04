# Feature 1: AI-Generated Journaling Prompts

## Implementation Order

| Order | Feature | Dependency |
|-------|---------|------------|
| 1 | Pattern Discovery | Foundation - no dependencies |
| **2** | **AI-Generated Prompts** | Uses patterns from Feature 1 |
| 3 | Personalized Conversations | Uses patterns |
| 4 | Enhanced Insights | Uses patterns |
| 5 | Working Theories | Builds on patterns |

---

## Overview

**What**: A screen showing AI-generated questions that help the user explore their own patterns, fill gaps in self-understanding, and give them a reason to journal even when nothing specific is on their mind.

**Why**: The user explicitly requested this. It creates actionable value from pattern discovery - not just insights to read, but questions to actually explore.

**Core Insight**: The prompts aren't generic journaling questions. They're specific to *this* user based on *their* patterns. The AI is essentially saying "I noticed something interesting - want to talk about it?"

---

## Design Philosophy

### This App's Personality

SecondBrain feels like a **thoughtful friend**, not a therapist or productivity tool. The prompts screen should embody this same warmth:

- **Warm, not clinical** - "I noticed..." not "Analysis indicates..."
- **Curious, not interrogating** - Questions feel like genuine interest, not data extraction
- **Gentle, not pushy** - Prompts are invitations, not assignments
- **Simple, not overwhelming** - A few good questions, not a wall of options

### Voice & Tone

**Good prompt language:**
- "You've mentioned feeling stuck at work a few times. What do you think is really going on there?"
- "I noticed you talk about Sarah differently lately. How are things between you two?"
- "You keep bringing up wanting to be more social but haven't explored what's stopping you. Any idea?"

**Bad prompt language:**
- "Reflect on your career trajectory and identify areas for growth" (too formal)
- "Tell me about your childhood" (too broad, not pattern-based)
- "You said X on Tuesday but Y on Friday - explain the discrepancy" (gotcha/judgmental)
- "How are you feeling today?" (too generic)

### Visual Design

The prompts screen should feel like a **cozy invitation to reflect**, not a task list:

- **Warm color palette** - Beige backgrounds, warm orange accents, soft peach highlights
- **Gentle cards** - Rounded corners, subtle shadows, breathing room
- **Minimal UI** - No clutter, no overwhelming options
- **Soft animations** - Cards fade in gently, nothing jarring
- **Friendly empty states** - When no prompts exist, the message should feel warm, not like an error

---

## User Experience

### Entry Points

1. **Tab in navigation** - "Prompts" or "Explore" tab alongside Home, History, Insights
2. **From Insights** - "Explore this further →" links on insights can navigate to related prompts

### Main Screen

```
┌─────────────────────────────────────┐
│  ←  Prompts                    ↻    │  ← Header with back & refresh
├─────────────────────────────────────┤
│                                     │
│  Questions worth exploring          │  ← Friendly section title
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 💭                              ││
│  │ You've mentioned feeling stuck  ││  ← The question
│  │ at work a few times lately.     ││
│  │ What do you think is really     ││
│  │ going on there?                 ││
│  │                                 ││
│  │ Based on 3 sessions               ││  ← Clickable context
│  │                                 ││
│  │  [Talk about this]  [Dismiss]   ││  ← Actions
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 💭                              ││
│  │ You talk about wanting more     ││
│  │ creative work, but your day job ││
│  │ sounds pretty routine. Is that  ││
│  │ tension something worth         ││
│  │ exploring?                      ││
│  │                                 ││
│  │ Based on 4 sessions             ││  ← Clickable context
│  │                                 ││
│  │  [Talk about this]  [Dismiss]   ││
│  └─────────────────────────────────┘│
│                                     │
│         ─ ─ ─ ─ ─ ─ ─ ─            │
│                                     │
│    Want more questions?             │  ← Generate more section
│    [Generate 5 more]                │
│                                     │
└─────────────────────────────────────┘
```

### Prompt Card Anatomy

Each prompt card contains:

1. **Icon** - A subtle thought bubble or similar warm icon
2. **Question** - The main prompt text (1-3 sentences, conversational)
3. **Context** - Fixed format "Based on X sessions" (clickable to view related sessions)
4. **Primary Action** - "Talk about this" → starts a new session with this prompt
5. **Dismiss Action** - "Dismiss" → hides the prompt (can be subtle, like a small X)

### Interactions

**Tapping "Talk about this":**
1. Haptic feedback (light)
2. Navigate to conversation screen
3. Session starts with AI referencing the prompt naturally:
   - "You wanted to explore [topic]. What's been on your mind about that?"
   - "So, [the question from the prompt]. What do you think?"
4. Prompt is deleted from the list. marked as `explored`, linked to new session. 

**Tapping "Not now" / Dismissing:**
1. Card animates out (slide or fade)
2. Prompt marked as `dismissed`
3. Won't appear again unless regenerated


**Tapping "Generate 5 more":**
1. Button shows loading state
2. AI generates new prompts
3. New cards animate in
4. Scroll to first new prompt

### Empty State

When no prompts are available (new user or all explored):

```
┌─────────────────────────────────────┐
│                                     │
│            💭                       │
│                                     │
│   Nothing to explore yet            │  ← Friendly title
│                                     │
│   Keep journaling and I'll start    │  ← Warm subtitle
│   noticing patterns worth           │
│   exploring together.               │
│                                     │
│   [Start a session]                 │  ← Helpful action
│                                     │
└─────────────────────────────────────┘
```

### Minimum Sessions Required

Prompts require enough history to find patterns. Suggested minimum: **3 sessions**.

Before that, show:
```
   Keep talking, questions are on the way

   I need a few more conversations before
   I can spot patterns worth exploring.
   2 more sessions to unlock prompts.
```

---

## Data Model

### Prompts Table

```sql
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,           -- The actual prompt question
  source_pattern_id TEXT,           -- Optional link to pattern that inspired it
  related_sessions TEXT NOT NULL,   -- JSON array of session IDs
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'explored' | 'dismissed' | 'expired'
  explored_session_id TEXT,         -- Session where this was discussed
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,         -- Auto-expire after 2 weeks
  FOREIGN KEY (source_pattern_id) REFERENCES patterns (id),
  FOREIGN KEY (explored_session_id) REFERENCES sessions (id)
);

CREATE INDEX idx_prompts_status ON prompts (status);
CREATE INDEX idx_prompts_created ON prompts (created_at DESC);
CREATE INDEX idx_prompts_expires ON prompts (expires_at);
```

### TypeScript Interface

```typescript
interface Prompt {
  id: string;
  question: string;          // "You've mentioned feeling stuck at work..."
  sourcePatternId?: string;  // Link to underlying pattern
  relatedSessions: string[]; // Session IDs this is based on
  status: 'active' | 'explored' | 'dismissed' | 'expired';
  exploredSessionId?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

---

## Prompt Generation

### When to Generate

1. **After session ends** - If patterns were updated, check if new prompts should be generated
2. **On demand** - When user taps "Generate 5 more"
3. **On app open** - If prompts are stale (all expired/dismissed) and enough history exists

### Generation Pipeline

```typescript
async function generatePrompts(count: number = 5): Promise<Prompt[]> {
  // 1. Load context
  const sessions = await getRecentSessions(90); // 3 months
  const patterns = await getActivePatterns();
  const existingPrompts = await getAllPrompts(); // To avoid duplicates
  const personalFacts = await getPersonalKnowledge();

  // 2. Build prompt for LLM
  const prompt = buildPromptGenerationPrompt(
    sessions,
    patterns,
    existingPrompts,
    personalFacts,
    count
  );

  // 3. Call LLM
  const response = await runPromptWithModel(prompt, modelPref, signal, {
    temperature: 0.7,  // Some creativity
    maxTokens: 2000,
  });

  // 4. Parse and validate
  const candidates = parsePromptResponse(response);
  const validated = validatePrompts(candidates, existingPrompts);

  // 5. Save and return
  for (const prompt of validated) {
    await savePrompt(prompt);
  }

  return validated;
}
```

### LLM Prompt

```
You are generating journaling prompts for a voice journaling app. The user talks to an AI friend to process their thoughts, and you're helping identify questions worth exploring based on their patterns.

THE USER:
[Personal facts about the user]

RECENT SESSIONS (past 3 months):
[For each session: date, summary, emotions, key points]

PATTERNS DETECTED:
[Active patterns with descriptions]

EXISTING PROMPTS (avoid duplicates):
[Current prompts - questions and statuses]

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

Return a JSON array:
[
  {
    "question": "The actual prompt question, 1-3 sentences, conversational",
    "related_sessions": ["session_id_1", "session_id_2"],
    "source_pattern_id": "optional pattern ID if directly from a pattern"
  }
]

Be selective. Only generate prompts that feel genuinely worth exploring. If you can't find ${count} good ones, return fewer. Quality over quantity.
```

### Validation Rules

Before saving a prompt:

1. **Not a duplicate** - Similar question doesn't already exist (use semantic similarity)
2. **Has substance** - Question is specific, not generic
3. **Based on evidence** - References at least 2 sessions
4. **Not too old** - Related sessions are from past 3 months
5. **Appropriate length** - Question is 1-3 sentences

---

## Session Integration

When a user starts a session from a prompt:

### Conversation Start

The AI's opening message should naturally reference the prompt:

```typescript
function buildPromptSessionOpener(prompt: Prompt): string {
  // Don't read the prompt verbatim - make it natural
  const openers = [
    `So, ${prompt.question.toLowerCase().replace(/\?$/, '')}. What's been on your mind about that?`,
    `You wanted to explore something. ${prompt.question}`,
    `I've been curious about this too. ${prompt.question}`,
  ];
  return openers[Math.floor(Math.random() * openers.length)];
}
```

### Session Context

The session should have context that this came from a prompt:

```typescript
interface JournalSession {
  // ... existing fields
  sourcePromptId?: string;  // If started from a prompt
}
```

This helps:
- Link the session back to the prompt
- Provide additional context in the AI's system prompt
- Mark the prompt as explored when session ends

### After Session Ends

```typescript
// In session end flow:
if (session.sourcePromptId) {
  await updatePrompt(session.sourcePromptId, {
    status: 'explored',
    exploredSessionId: session.id,
  });
}
```

---

## Expiration & Lifecycle

### Prompt Expiration

Prompts expire after **2 weeks** by default. This ensures:
- Prompts stay relevant to current concerns
- Old patterns don't resurface when no longer relevant
- Fresh prompts feel timely, not stale

### Lifecycle States

```
┌──────────┐     user taps      ┌──────────┐
│  active  │  ──────────────►   │ explored │
└──────────┘   "Talk about"     └──────────┘
     │
     │ user taps "Not now"
     ▼
┌───────────┐
│ dismissed │
└───────────┘
     │
     │ 2 weeks pass (any state)
     ▼
┌──────────┐
│ expired  │
└──────────┘
```

### Cleanup

Run periodically (on app open or background):

```typescript
async function cleanupExpiredPrompts(): Promise<void> {
  const now = new Date();
  await updateExpiredPrompts(now); // Mark expired
  await deleteOldPrompts(30); // Delete prompts > 30 days old
}
```

---

## Files to Create/Modify

### New Files

- `app/app/prompts.tsx` - Prompts screen
- `app/src/services/prompts.ts` - Prompt generation and management
- `app/src/hooks/usePrompts.ts` - Hook for prompts screen state
- `app/src/components/PromptCard.tsx` - Prompt card component

### Modified Files

- `app/src/services/database.ts` - Add prompts table and CRUD
- `app/src/types/index.ts` - Add Prompt type
- `app/app/_layout.tsx` - Add Prompts to navigation
- `app/app/conversation.tsx` - Handle sessions started from prompts

---

## Component Specifications

### PromptsScreen (`prompts.tsx`)

```typescript
export default function PromptsScreen() {
  const {
    prompts,         // Active prompts
    state,           // 'loading' | 'ready' | 'generating' | 'insufficient_data'
    sessionCount,    // For insufficient data message
    generateMore,    // Function to generate 5 more
    dismissPrompt,   // Function to dismiss
    startSession,    // Function to start session from prompt
  } = usePrompts();

  // Render based on state...
}
```

### PromptCard (`PromptCard.tsx`)

```typescript
interface PromptCardProps {
  prompt: Prompt;
  onTalk: () => void;
  onDismiss: () => void;
  onViewSessions: (sessionIds: string[]) => void;
}

function PromptCard({ prompt, onTalk, onDismiss, onViewSessions }: PromptCardProps) {
  return (
    <Animated.View entering={FadeInUp} style={styles.card}>
      <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
      <Text style={styles.question}>{prompt.question}</Text>
      
      <Pressable onPress={() => onViewSessions(prompt.relatedSessions)}>
        <Text style={[styles.sessionLink, { textDecorationLine: 'underline' }]}>
          Based on {prompt.relatedSessions.length} sessions
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={onTalk} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Talk about this</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissButtonText}>Not now</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
```

### Styling Guidelines

```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundTertiary,  // White/cream
    borderRadius: borderRadius.md,               // Soft corners
    borderWidth: 1,
    borderColor: colors.border,                  // Subtle border
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,                             // Gentle shadow
  },
  question: {
    ...typography.body,
    color: colors.text,                          // Deep brown
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  sessionLink: {
    ...typography.caption,
    color: colors.textSecondary,                 // Soft brown
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,             // Warm orange
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  primaryButtonText: {
    ...typography.bodySemibold,
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
```

---

## Success Criteria

After implementation:

- [ ] Prompts feel specific and personal, not generic
- [ ] UI feels warm and inviting, not task-like
- [ ] "Talk about this" smoothly starts a session with context
- [ ] Prompts expire and refresh naturally
- [ ] "Generate more" provides fresh, non-duplicate prompts
- [ ] Empty state feels friendly, not like an error
- [ ] Prompts are based on actual patterns from user's history

---

## Testing Approach

1. **Quality of generated prompts** - Are they specific? Non-generic? Based on real patterns?
2. **Flow testing** - Does starting a session from a prompt feel natural?
3. **Edge cases**:
   - New user with 0-2 sessions
   - User with many sessions but no clear patterns
   - All prompts dismissed - does "Generate more" work?
   - Prompt expiration
4. **UI/UX feel** - Does it feel warm? Is it intuitive?

---

## Example Prompts

Based on hypothetical user patterns:

| Pattern | Generated Prompt |
|---------|-----------------|
| Mentions work stress 4x in 3 weeks | "Work keeps coming up as stressful. Have you thought about what would actually need to change for it to feel better?" |
| Talks about girlfriend logistics, not feelings | "You mention Sarah a lot in terms of plans and schedules. How are you two actually doing, like emotionally?" |
| Says "I should" about exercise repeatedly | "You've mentioned wanting to exercise a few times but it hasn't happened. What's getting in the way?" |
| Career change mentioned but not explored | "You've brought up maybe switching careers. Is that something you're seriously considering or just venting?" |
| Different tone about parents when stressed | "I notice you talk about your parents differently when you're stressed vs. when you're calm. What's your actual relationship like with them?" |
