# Feature 4: Enhanced Insights

## Implementation Order

| Order | Feature | Dependency |
|-------|---------|------------|
| 1 | Pattern Discovery | Foundation - no dependencies |
| 2 | AI-Generated Prompts | Uses patterns |
| 3 | Personalized Conversations | Uses patterns |
| **4** | **Enhanced Insights** | Uses patterns, benefits from prompts |
| 5 | Working Theories | Builds on patterns |

---

## Overview

**What**: Make the insights screen show non-obvious connections and trends with evidence, not just summaries of what happened.

**Why**: Current insights may be too surface-level ("You talked about work this week"). The user wants insights that reveal things they wouldn't notice themselves - patterns, connections, blind spots, and growth over time.

**Core Insight**: The difference between "You were stressed this week" and "Your stress about work has been building over the past month - you mentioned it in 5 sessions with increasing intensity" is evidence. Evidence makes insights believable and actionable.

---

## Design Philosophy

### Insights Should Feel Like Revelations

Not: "You talked about work, relationships, and health this week."
But: "Every time you talk about your girlfriend, you're also stressed about school. There might be a connection worth exploring."

### Evidence Creates Trust

When the app says "you've been more stressed lately," the user should be able to tap and see which sessions support that claim. Evidence = credibility.

### Growth Is Encouraging

Insights shouldn't only be about problems. Showing what's resolved, what's improved, and what the user has worked through is validating and motivating.

### Warm, Not Clinical

Same philosophy as the rest of the app. Insights should read like observations from a thoughtful friend, not a clinical report.

---

## Current State

### What Exists

The current insights system:
- Loads memory nodes for a period (week, month, all time)
- Sends session summaries to an LLM
- Gets back: insights, emotional summary, topic summary
- Displays in cards with icons

### What's Missing

1. **Pattern Integration** - Doesn't use the patterns from Feature 2
2. **Evidence Display** - Shows "Based on 3 sessions" but no links or details
3. **Non-Obvious Connections** - LLM prompt doesn't specifically ask for these
4. **Blind Spots** - Doesn't surface things mentioned but not addressed
5. **Trend Visualization** - No arrows, charts, or before/after
6. **Prompt Links** - No connection to "Explore this further" prompts

---

## Enhanced Insight Types

### 1. Trends with Evidence

**What it is:** Patterns that show direction over time - increasing, decreasing, or shifting.

**Example:**
```
↑ Work stress has been building

Your stress about work has increased over the past month. You mentioned
it in 5 sessions, and the tone has shifted from "annoying" to "overwhelming."

Evidence: Oct 15, Oct 22, Oct 28, Nov 3, Nov 10
[Explore this further →]
```

**Key elements:**
- Direction indicator (↑ ↓ →)
- Specific observation with timeline
- Linked sessions as evidence
- Optional: link to related prompt

### 2. Non-Obvious Connections

**What it is:** Links between things the user might not have noticed.

**Example:**
```
🔗 A pattern worth noticing

Every time you talk about your girlfriend, you're also stressed about
school. This has happened in 4 sessions. There might be a connection
between relationship time and academic pressure.

Evidence: Oct 18, Oct 25, Nov 1, Nov 8
```

**Key elements:**
- Two things that co-occur
- Frequency of co-occurrence
- Gentle framing (not accusatory)

### 3. Recurring Blind Spots

**What it is:** Things the user mentions but doesn't act on or explore.

**Example:**
```
🔄 Something you keep coming back to

You've mentioned wanting to be more social in 4 sessions, but haven't
talked about what's actually stopping you or any steps you've taken.
Want to dig into this?

[Start a conversation about this →]
```

**Key elements:**
- Topic that recurs without resolution
- Count of mentions
- Invitation to explore (not judgment)
- Link to start a session or related prompt

### 4. Growth & Resolution

**What it is:** Positive changes - things that have improved or resolved.

**Example:**
```
🌱 Something that's shifted

You haven't mentioned the conflict with your coworker in 3 weeks. Last
time you talked about it, you'd had a good conversation with them.
Seems like that's behind you now.

Evidence: Resolved around Oct 20
```

**Key elements:**
- What used to be a concern
- Evidence it's resolved (absence + last positive mention)
- Encouraging framing

### 5. Relationship Insights

**What it is:** How the user talks about specific people over time.

**Example:**
```
👥 Sarah in your conversations

You've mentioned Sarah in 8 sessions. Early mentions were excited and
romantic. Lately, it's more about logistics - schedules, chores, plans.
You haven't talked about deeper connection in about 3 weeks.

[How are things with Sarah? →]
```

**Key elements:**
- Specific person
- How mentions have evolved
- Gentle observation (not judgment)
- Invitation to reflect

---

## Enhanced UI Design

### Insight Card Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│  ↑  Work stress has been building                           │  ← Icon + Title
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your stress about work has increased over the past month.  │  ← Narrative
│  You mentioned it in 5 sessions, and the tone has shifted   │
│  from "annoying" to "overwhelming."                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📅 Oct 15 · Oct 22 · Oct 28 · Nov 3 · Nov 10               │  ← Evidence (tappable)
├─────────────────────────────────────────────────────────────┤
│  [Explore this further →]                                   │  ← Action (optional)
└─────────────────────────────────────────────────────────────┘
```

### Evidence Expansion

When user taps on evidence dates:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Sessions about work stress                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Nov 10                                                  ││
│  │ "I can't keep up with everything at work. It feels     ││
│  │ overwhelming and I don't see it getting better."        ││
│  │ (anxious, overwhelmed)                      [View →]    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Nov 3                                                   ││
│  │ "Work has been really stressful. The deadline keeps    ││
│  │ moving up and my manager isn't helping."                ││
│  │ (stressed, frustrated)                      [View →]    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ... more sessions ...                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Trend Indicators

Visual indicators for direction:

| Indicator | Meaning | Color |
|-----------|---------|-------|
| ↑ | Increasing | `colors.warning` or `colors.error` (context-dependent) |
| ↓ | Decreasing | `colors.success` (if good) or `colors.warning` (if concerning) |
| → | Stable | `colors.textSecondary` |
| ↗ | Slightly increasing | Lighter warning |
| ↘ | Slightly decreasing | Lighter success/warning |

### Insight Type Icons

| Type | Icon | Color |
|------|------|-------|
| Trend | `trending-up` / `trending-down` | Context-dependent |
| Connection | `git-merge-outline` | `colors.primary` |
| Blind Spot | `refresh-circle-outline` | `colors.warning` |
| Growth | `leaf-outline` | `colors.success` |
| Relationship | `people-outline` | `colors.primary` |

---

## Pattern Integration

### Loading Patterns for Insights

```typescript
async function generateInsightsReport(
  memoryNodes: MemoryNode[],
  period: InsightPeriod
): Promise<InsightsReport | null> {
  // Load patterns for this period
  const patterns = await getActivePatterns();
  const relevantPatterns = filterPatternsByPeriod(patterns, period);

  // Prepare data including patterns
  const analysisData = prepareAnalysisData(memoryNodes, relevantPatterns, period);

  // Generate insights
  const aiResponse = await callInsightsAI(analysisData);
  // ...
}
```

### Including Patterns in Prompt

Patterns provide pre-identified themes that the LLM can reference and expand upon:

```typescript
function prepareAnalysisData(
  memoryNodes: MemoryNode[],
  patterns: Pattern[],
  period: InsightPeriod
): AnalysisData {
  return {
    period,
    periodLabel: getPeriodLabel(period),
    sessionCount: memoryNodes.length,
    sessions: formatSessions(memoryNodes),
    patterns: formatPatterns(patterns),  // NEW
  };
}
```

---

## Enhanced LLM Prompt

```
You are analyzing journal sessions to generate insights that reveal patterns
the user wouldn't notice themselves. Think like a thoughtful friend who's been
paying attention, not a data analyst.

═══════════════════════════════════════════════════════════════════════════════
SESSIONS FROM ${periodLabel.toUpperCase()} (${sessionCount} total)
═══════════════════════════════════════════════════════════════════════════════

${formattedSessions}

═══════════════════════════════════════════════════════════════════════════════
PATTERNS ALREADY DETECTED
═══════════════════════════════════════════════════════════════════════════════

${formattedPatterns}

═══════════════════════════════════════════════════════════════════════════════
WHAT TO LOOK FOR
═══════════════════════════════════════════════════════════════════════════════

Generate 4-6 insights. Focus on things the user probably hasn't noticed:

1. TRENDS WITH EVIDENCE
   - Not "you were stressed" but "stress about X has increased over Y timeframe"
   - Include direction: getting better, worse, or shifting
   - Reference specific sessions as evidence

2. NON-OBVIOUS CONNECTIONS
   - Things that co-occur but user might not have linked
   - "Every time you talk about X, you're also dealing with Y"
   - Be specific about frequency

3. RECURRING BLIND SPOTS
   - Things mentioned multiple times without action or exploration
   - "You've mentioned X four times but haven't explored what's behind it"
   - Frame as invitation, not judgment

4. GROWTH & RESOLUTION
   - What's improved or resolved
   - Topics that used to come up but don't anymore
   - Positive shifts in how they talk about something

5. RELATIONSHIP DYNAMICS (if applicable)
   - How specific people appear in their conversations
   - Changes in how they talk about someone over time

═══════════════════════════════════════════════════════════════════════════════
TONE GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

DO:
- Sound like a thoughtful friend noticing something
- Be specific with evidence ("in 4 sessions", "since mid-October")
- Frame observations gently, not judgmentally
- Celebrate growth and resolution
- Use natural language ("seems like", "you might want to explore")

DON'T:
- Just summarize what happened ("you talked about work and school")
- Be clinical ("analysis indicates elevated stress markers")
- Be judgmental ("you're avoiding this problem")
- State the obvious ("you were busy this week")
- Force insights where there aren't any

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "insights": [
    {
      "type": "trend" | "connection" | "blind_spot" | "growth" | "relationship",
      "title": "Short, friendly headline (5-10 words)",
      "narrative": "2-4 sentences like a friend noticing something. Include specific evidence.",
      "direction": "increasing" | "decreasing" | "stable" | "shifted" | null,
      "evidence": {
        "sessionDates": ["Nov 10", "Nov 3", "Oct 28"],
        "quotes": ["brief quote from session", "another quote"],
        "frequency": "4 times in 3 weeks"
      },
      "relatedPatternId": "optional - if this builds on a detected pattern",
      "suggestedPromptQuestion": "optional - a question to explore this further"
    }
  ],
  "emotionalSummary": {
    "dominantEmotions": ["top 3 emotions"],
    "trend": "improving" | "stable" | "declining" | "mixed",
    "trendNarrative": "How they've been feeling overall, in 1-2 sentences"
  },
  "topicSummary": {
    "recurringTopics": ["topics that keep coming up"],
    "emergingTopics": ["new topics that appeared recently"],
    "resolvedTopics": ["topics that seem to have faded or resolved"]
  },
  "periodComparison": {
    "vsLastPeriod": "Brief comparison to previous period if applicable",
    "notableChanges": ["what's different from before"]
  }
}

Quality over quantity. If there are only 2-3 genuine insights, that's better
than 6 forced ones. Return valid JSON only.
```

---

## Data Model Changes

### Enhanced Insight Interface

```typescript
interface Insight {
  id: string;
  type: 'trend' | 'connection' | 'blind_spot' | 'growth' | 'relationship';
  title: string;
  narrative: string;
  direction?: 'increasing' | 'decreasing' | 'stable' | 'shifted';
  evidence: {
    sessionIds: string[];
    sessionDates: string[];
    quotes?: string[];
    frequency?: string;
  };
  relatedPatternId?: string;
  suggestedPromptQuestion?: string;
  priority: 'high' | 'medium' | 'low';
  generatedAt: Date;
  expiresAt?: Date;
  period: InsightPeriod;
}

interface InsightsReport {
  id: string;
  generatedAt: Date;
  period: InsightPeriod;
  sessionCount: number;
  insights: Insight[];
  emotionalSummary: EmotionalSummary;
  topicSummary: TopicSummary;
  periodComparison?: PeriodComparison;  // NEW
}

interface PeriodComparison {
  vsLastPeriod: string;
  notableChanges: string[];
}
```

### Database Updates

The insights table already exists but may need updates for new fields:

```sql
-- Add columns if needed
ALTER TABLE insights ADD COLUMN direction TEXT;
ALTER TABLE insights ADD COLUMN evidence_quotes TEXT;  -- JSON array
ALTER TABLE insights ADD COLUMN evidence_frequency TEXT;
ALTER TABLE insights ADD COLUMN related_pattern_id TEXT;
ALTER TABLE insights ADD COLUMN suggested_prompt TEXT;
```

---

## UI Components

### InsightCard Enhancement

```typescript
interface InsightCardProps {
  insight: Insight;
  onViewEvidence: (sessionIds: string[]) => void;
  onExplore?: (question: string) => void;
}

function InsightCard({ insight, onViewEvidence, onExplore }: InsightCardProps) {
  return (
    <View style={styles.card}>
      {/* Header with icon and title */}
      <View style={styles.header}>
        <DirectionIcon direction={insight.direction} type={insight.type} />
        <Text style={styles.title}>{insight.title}</Text>
      </View>

      {/* Narrative */}
      <Text style={styles.narrative}>{insight.narrative}</Text>

      {/* Evidence (tappable) */}
      {insight.evidence.sessionDates.length > 0 && (
        <Pressable
          onPress={() => onViewEvidence(insight.evidence.sessionIds)}
          style={styles.evidenceRow}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.evidenceText}>
            {insight.evidence.sessionDates.join(' · ')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Pressable>
      )}

      {/* Explore action */}
      {insight.suggestedPromptQuestion && onExplore && (
        <Pressable
          onPress={() => onExplore(insight.suggestedPromptQuestion!)}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreText}>Explore this further</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
```

### DirectionIcon Component

```typescript
function DirectionIcon({ direction, type }: { direction?: string; type: string }) {
  // Determine icon based on type and direction
  const getIcon = () => {
    if (type === 'growth') return 'leaf-outline';
    if (type === 'connection') return 'git-merge-outline';
    if (type === 'blind_spot') return 'refresh-circle-outline';
    if (type === 'relationship') return 'people-outline';

    // Trend type uses direction
    if (direction === 'increasing') return 'trending-up';
    if (direction === 'decreasing') return 'trending-down';
    return 'remove-outline'; // stable
  };

  const getColor = () => {
    if (type === 'growth') return colors.success;
    if (type === 'blind_spot') return colors.warning;
    if (direction === 'increasing' && type === 'trend') return colors.warning;
    if (direction === 'decreasing' && type === 'trend') return colors.success;
    return colors.primary;
  };

  return <Ionicons name={getIcon()} size={20} color={getColor()} />;
}
```

### Evidence Modal

```typescript
function EvidenceModal({
  visible,
  sessionIds,
  title,
  onClose,
  onViewSession,
}: EvidenceModalProps) {
  const sessions = useSessions(sessionIds);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {sessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => onViewSession(session.id)}
              style={styles.sessionCard}
            >
              <Text style={styles.sessionDate}>
                {format(session.startedAt, 'MMMM d')}
              </Text>
              <Text style={styles.sessionSummary} numberOfLines={3}>
                {session.memoryNode?.summary || session.transcript.slice(0, 150)}
              </Text>
              {session.memoryNode?.emotions.length > 0 && (
                <Text style={styles.sessionEmotions}>
                  {session.memoryNode.emotions.join(', ')}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
```

---

## Integration with Prompts

### "Explore this further" Flow

When an insight has a `suggestedPromptQuestion`:

1. User taps "Explore this further"
2. App creates or finds a matching prompt
3. Navigates to conversation screen with that prompt

```typescript
async function handleExploreInsight(question: string, insight: Insight) {
  // Check if a similar prompt already exists
  const existingPrompt = await findSimilarPrompt(question);

  if (existingPrompt) {
    // Navigate to conversation with existing prompt
    router.push(`/conversation?promptId=${existingPrompt.id}`);
  } else {
    // Create a new prompt from the insight
    const newPrompt = await createPrompt({
      question,
      context: `Based on an insight: "${insight.title}"`,
      relatedSessions: insight.evidence.sessionIds,
      sourcePatternId: insight.relatedPatternId,
    });

    router.push(`/conversation?promptId=${newPrompt.id}`);
  }
}
```

---

## Files to Modify

### Modified Files

- `app/src/services/insights.ts` - Enhanced prompt, pattern integration, new parsing
- `app/app/insights.tsx` - Enhanced UI with evidence, actions, direction indicators
- `app/src/types/index.ts` - Updated Insight interface with new fields

### New Components

- `app/src/components/InsightCard.tsx` - Enhanced insight card (or modify existing)
- `app/src/components/DirectionIcon.tsx` - Direction/type indicator
- `app/src/components/EvidenceModal.tsx` - Modal showing supporting sessions

---

## Example Insights

### Trend with Evidence

```json
{
  "type": "trend",
  "title": "Work stress has been building",
  "narrative": "Your stress about work has increased noticeably over the past month. You mentioned it in 5 sessions, and the language shifted from 'annoying' to 'overwhelming.' The deadline pressure seems to be the main driver.",
  "direction": "increasing",
  "evidence": {
    "sessionDates": ["Nov 10", "Nov 3", "Oct 28", "Oct 22", "Oct 15"],
    "quotes": ["I can't keep up with everything", "It feels overwhelming"],
    "frequency": "5 times in 4 weeks"
  },
  "suggestedPromptQuestion": "Work stress keeps coming up. What would need to change for it to feel manageable?"
}
```

### Non-Obvious Connection

```json
{
  "type": "connection",
  "title": "Girlfriend and school stress overlap",
  "narrative": "I noticed something interesting - every time you talk about Sarah, you're also dealing with school stress. This happened in 4 sessions. There might be a connection between relationship time and feeling behind academically.",
  "direction": null,
  "evidence": {
    "sessionDates": ["Nov 8", "Nov 1", "Oct 25", "Oct 18"],
    "frequency": "4 co-occurrences"
  },
  "suggestedPromptQuestion": "You often mention Sarah when you're stressed about school. Is there a connection there?"
}
```

### Blind Spot

```json
{
  "type": "blind_spot",
  "title": "The social life question",
  "narrative": "You've mentioned wanting to be more social in 4 sessions, but haven't explored what's actually stopping you. Each time you mention it and then move on to something else.",
  "direction": null,
  "evidence": {
    "sessionDates": ["Nov 5", "Oct 29", "Oct 15", "Oct 8"],
    "frequency": "4 times without exploration"
  },
  "suggestedPromptQuestion": "You keep mentioning wanting to be more social. What do you think is actually stopping you?"
}
```

### Growth

```json
{
  "type": "growth",
  "title": "The coworker situation resolved",
  "narrative": "You haven't mentioned the conflict with your coworker in 3 weeks. Last time it came up, you'd had a good conversation with them and felt better about the situation. Seems like that's behind you now.",
  "direction": "decreasing",
  "evidence": {
    "sessionDates": ["Oct 20"],
    "quotes": ["We finally talked and it went well"]
  }
}
```

---

## Success Criteria

After implementation:

- [ ] Insights reveal non-obvious patterns, not just summaries
- [ ] Each insight has tappable evidence linking to sessions
- [ ] Direction indicators show trends visually
- [ ] "Explore this further" creates or links to prompts
- [ ] Growth/resolution insights are included (positive reinforcement)
- [ ] Blind spots are surfaced gently, not judgmentally
- [ ] Insights integrate with detected patterns from Feature 2

---

## Testing Approach

1. **Insight quality** - Are they non-obvious? Specific? Evidence-based?
2. **Evidence accuracy** - Do the linked sessions actually support the insight?
3. **UI flow** - Evidence modal works, explore action navigates correctly
4. **Edge cases**:
   - Few sessions (3-5) - should still find something meaningful
   - Many sessions (50+) - shouldn't be overwhelming
   - No clear patterns - should return fewer insights, not forced ones
5. **Tone check** - Do insights sound like a friend, not a report?
