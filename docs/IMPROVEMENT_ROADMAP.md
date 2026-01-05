# SecondBrain Improvement Roadmap

## User Priorities Summary

Based on user interview conducted 2026-01-04:

- **Primary Value**: Discovering patterns over time through smarter memory & insights
- **Core Use Case**: Multiple times per week journaling to build understanding over time
- **Success Metric**: Conversations feel more personalized - AI proactively references past in natural, meaningful ways
- **Discovery Philosophy**: Auto-discovery is key - value is in the AI noticing things the user wouldn't notice themselves

---

## Implementation Philosophy

**LLM-First, Not Schema-First**

Traditional approaches force unstructured conversation into rigid database schemas. This project takes a different approach:

1. **Store patterns as free-form text** - Not `{sentiment: "negative", intensity: 0.7}` but rather "User felt trapped and anxious about the internship, desperately wanted to escape back to college life"

2. **Emergent analysis over deterministic rules** - Instead of "mentioned 3+ times = recurring theme", give the LLM full context and ask "what patterns do you notice?"

3. **Minimal structure, maximum context** - Store timestamps, session links, and confidence scores, but let the LLM interpret meaning

4. **Re-analysis friendly** - Design so the LLM can re-examine raw data and update its understanding as more context accumulates

---

## Data Integrity (Cross-Cutting Concern)

**Problem:** False patterns can be created from incomplete information and persist indefinitely, corrupting the user's experience.

**Solution:** Multiple safeguards across all features:

### Pattern Creation Thresholds
- **Minimum 6 sessions** must mention the topic/pattern
- **Minimum 4 weeks** span between first and most recent evidence
- Patterns below threshold are stored as `developing` status and not used in conversations

### Contradiction Detection
- When new sessions contradict existing patterns, flag for user review
- User decides: keep pattern, update it, or delete it
- Don't auto-update - let the user be the source of truth

### Cascading Deletion
- When sessions are deleted, update pattern evidence counts
- If pattern has < 3 remaining sessions, mark as `insufficient_evidence`
- If pattern has 0 remaining sessions, auto-delete

### Settings UI: Pattern Management
- **Settings → Patterns** shows all detected patterns
- View confidence scores and evidence (linked sessions)
- Review flagged contradictions
- Delete any pattern you disagree with

### Theory Safeguards (Feature 5)
- Theories require EVEN HIGHER thresholds (10+ sessions, 8+ weeks)
- Theories auto-decay if contradicted repeatedly
- Theories are background understanding, not prominently displayed

See individual feature specs in `docs/specs/` for detailed implementation.

---

## Feature 1: AI-Generated Journaling Prompts

**What It Is:**
A dedicated screen showing AI-generated questions based on analysis of all journal sessions. These prompts help the AI fill gaps in understanding and guide the user toward valuable self-reflection.

**Why It Matters:**
- Addresses the core goal: help the AI get better understanding of WHY the user is a certain way
- Creates actionable value from pattern discovery - not just insights to read, but questions to explore
- Drives engagement: gives user a reason to journal even when they don't have something specific on their mind

**What Makes a Good Prompt:**
- Specific to user's patterns: "You mention X when Y happens - what's the connection?"
- Explores unresolved questions: "You've brought up changing careers several times without deciding - want to explore that?"
- Fills knowledge gaps: "I don't understand why you react this way to authority figures - can you talk about that?"

**What Makes a Bad Prompt:**
- Generic: "How are you feeling today?"
- Not pattern-based: "What are your goals?"
- Contradiction-focused: Playing gotcha or judge

**Storage & Lifecycle:**
- Prompts stored with expiration (e.g., 2 weeks)
- Tracked status: `active`, `explored`, `dismissed`, `expired`
- User can tap "Generate more prompts" to get 5 fresh ones on demand
- Link explored prompts to the session where they were discussed

**Generation Approach:**
Give the LLM access to:
- All sessions from past 1-3 months (full text or rich summaries)
- Existing prompts (to avoid duplicates)
- Personal facts about the user

Ask it to find:
- Recurring behaviors mentioned but not explained
- Questions raised multiple times without resolution
- Topics the user circles around but doesn't fully explore
- Emotional reactions lacking clear context
- Relationship dynamics that seem significant but underexplored

**UI:**
- New "Prompts" tab in navigation
- Prompt cards showing: the question, clickable session count ("Based on X sessions")
- Actions: "Journal about this" (starts session), "Not interesting" (dismiss)
- "Generate more" button when prompts are stale or all explored

---

## Feature 2: Smarter Pattern Discovery

**What It Is:**
Enhanced memory system that identifies patterns the user wouldn't notice themselves - emotional trends, opinion evolution, relationship dynamics, and recurring unresolved questions.

**Why It Matters:**
- Core value proposition: discovering patterns over time
- User example: "I thought internship was stressful, then in college I missed it" - wants AI to notice these shifts
- Focuses on month-to-month patterns primarily, with some longer-term tracking

**Pattern Types:**

**A. Emotional Trends**
- How emotional states shift across sessions
- Triggering contexts: "You feel anxious when talking about X"
- Baseline vs. deviation: "You seem more stressed than usual"

**B. Opinion Evolution**
- How feelings about topics/people/situations change over time
- Store as narrative: "In August, user was desperate to leave internship. By late September, user expressed nostalgia for the structure and purpose it provided."
- Surface naturally: "A few weeks ago you were really stressed about college. How's that feeling now?"

**C. Relationship Dynamics**
- How user talks about specific people over time
- Contexts they appear in (stressed vs happy, work vs personal)
- Changes in how they're discussed

**D. Recurring Unresolved Questions**
- Things mentioned multiple times without resolution
- Feed into the Prompts system
- Surface during conversation when relevant

**Storage Approach:**
Store patterns as free-form text entries with metadata:
```
{
  id: uuid,
  pattern_type: "emotional_trend" | "opinion_evolution" | "relationship" | "unresolved_question",
  description: "User consistently feels anxious on Sunday evenings when thinking about the work week ahead. This has appeared in 4 sessions over the past month, often accompanied by mentions of their manager.",
  first_observed: timestamp,
  last_updated: timestamp,
  related_sessions: [session_ids],
  still_relevant: boolean
}
```

**Detection Approach:**
After each session, give the LLM:
- The new session transcript
- Recent sessions for context
- Existing stored patterns

Ask: "What patterns do you notice? Are any existing patterns reinforced or contradicted? Any new patterns emerging?"

---

## Feature 3: Personalized Conversation AI

**What It Is:**
Make conversations feel like talking to someone who genuinely knows you and remembers past discussions naturally.

**Why It Matters:**
- User's primary success metric: "Conversations feel more personalized"
- Want proactive references to past moments, not just when asked

**Key Improvements:**

**A. Richer Context Injection**
Currently: AI gets personal facts + top memory nodes
Enhanced: AI also gets:
- Relevant stored patterns for topics being discussed
- How user has talked about this topic before
- Emotional context from past discussions
- Any related unresolved questions

**B. Better Memory References**
Not: "You mentioned this before"
But: "Last time you talked about your internship, you were pretty stressed about it. Sounds different now?"

Include:
- Emotional context from the past
- Natural timeframes ("a few weeks ago" not "on September 15th")
- Connection to patterns: "This feels similar to when you were dealing with [past situation]"

**C. Emotional Attunement**
- "You sound more stressed than usual - what's going on?"
- "You seem really energized about this - that's not how you usually talk about work"
- Match energy appropriately

**D. Know When to Probe vs. Let It Flow**
- Circling an unresolved question → gentle probe
- Just venting → validate, don't interrogate
- Mentions someone new → ask who they are
- Says something differently than before → gently note the shift

**Implementation:**
Enhanced system prompt that includes:
- Personal facts (always)
- Relevant patterns for current topics
- Recent emotional baseline
- Guidance on natural referencing

---

## Feature 4: Enhanced Insights

**What It Is:**
Make insights screen show non-obvious connections and trends with evidence, not just summaries.

**Why It Matters:**
- Current insights may be too surface-level
- Want to discover recurring blind spots and see growth over time

**Key Improvements:**

**A. Trends with Evidence**
Not: "You were stressed this week"
But: "Your stress about work has been building over the past month" + links to 3 sessions showing this

**B. Non-Obvious Connections**
- "You feel most anxious on Sundays when thinking about the week ahead"
- "Every time you talk about your girlfriend, you're also stressed about school"
- "You say you're happy with your major but avoid talking about classes"

**C. Recurring Blind Spots**
- "You've mentioned feeling disconnected from friends 4 times but haven't talked about reaching out"
- "Work-life balance comes up every week but you haven't made changes"

**D. Growth Visualization**
- Resolved concerns: topics that have faded
- New concerns: topics appearing or increasing
- Emotional shifts: "You were anxious about X for weeks, now you seem settled"

**Generation Approach:**
Give the LLM all session data for the period and ask it to find:
- Trends with specific evidence
- Non-obvious connections
- Things user mentions but doesn't address
- What's changed, what's resolved, positive progress

Do NOT just summarize what happened.

**UI Improvements:**
- Show evidence (session links) for each insight
- Simple trend indicators (↑↓ arrows)
- Link to related prompts: "Explore this further →"

---

## Feature 5: Long-term Understanding (Working Theories)

**What It Is:**
A layer of deep understanding that develops over months - theories about the user's beliefs, values, and behavioral patterns.

**Why It Matters:**
- Some patterns only reveal themselves over long periods
- Understanding WHY user behaves certain ways requires accumulated evidence
- Example: "User values independence highly but also seeks external validation - this creates internal conflict"

**Conceptual Approach:**

The AI maintains "working theories" - not facts, but hypotheses being tested over time:
- "User avoids difficult conversations, tends to process alone"
- "User has high standards for themselves, leading to impostor syndrome"
- "User's relationship with authority figures is complicated by childhood experiences"

**Storage:**
Free-form narratives with light structure:
```
{
  id: uuid,
  theory: "User values creative expression and autonomy highly. When work feels routine or constrained, they become restless and start questioning their path. This pattern has appeared across discussions of internship, classes, and side projects.",
  confidence: 0.7,  // LLM's self-assessed confidence
  last_evaluated: timestamp,
  evidence_sessions: [session_ids],
  status: "developing" | "confident" | "questioning"
}
```

**Evolution:**
- Theories are re-evaluated when new relevant sessions occur
- Confidence can increase or decrease based on evidence
- Theories inform prompt generation: test low-confidence theories with questions
- Theories appear in insights when relevant: "Working theory: [description]"

**Agentic Exploration:**
When the AI has a developing theory:
1. Generate prompts to explore it
2. Ask follow-up questions during sessions
3. Look for counter-evidence
4. Update confidence based on responses

---

## Success Criteria

After 2-3 weeks of real usage:

**Conversations feel personalized**
- AI references past moments naturally and specifically
- User feels genuinely known and understood
- References include emotional context, not just facts

**Prompts are compelling**
- User actually wants to journal about the questions
- Prompts feel specific and non-obvious
- At least 1-2 prompts per week worth exploring

**Insights reveal non-obvious patterns**
- User has "oh, I didn't realize that" moments
- Trends shown with evidence
- Insights lead to self-awareness

**Discovery happens automatically**
- User doesn't have to query or search
- AI surfaces relevant patterns proactively
- System gets smarter as sessions accumulate

---

## Anti-Patterns to Avoid

- **Don't be a judge**: No gotcha moments, no "you contradicted yourself"
- **Don't be generic**: "How are you feeling?" is bad. "You mention X when Y - what's that about?" is good.
- **Don't dump memory**: Only surface when genuinely relevant
- **Don't over-structure**: Let the LLM interpret meaning, don't force rigid categories
- **Don't prioritize contradictions**: Focus on growth, trends, questions, knowledge gaps

---

## Implementation Notes

### Key Files

**Feature 1 - Prompts:**
- `app/app/prompts.tsx` (new screen)
- `app/src/services/prompts.ts` (new service)
- `app/src/services/database.ts` (prompts table)

**Feature 2 - Pattern Discovery:**
- `app/src/services/patterns.ts` (new service)
- `app/src/services/ai.ts` (pattern detection after sessions)
- `app/src/services/database.ts` (patterns table)

**Feature 3 - Personalized Conversations:**
- `app/src/services/ai.ts` (enhanced context building)
- `app/src/hooks/useSession.ts` (richer context loading)

**Feature 4 - Enhanced Insights:**
- `app/src/services/insights.ts` (improved generation)
- `app/app/insights.tsx` (UI improvements)

**Feature 5 - Working Theories:**
- `app/src/services/theories.ts` (new service)
- `app/src/services/database.ts` (theories table)
- `app/app/insights.tsx` (display theories)

### Testing Strategy

1. Manual testing with real usage (most important)
2. Quality checks on AI outputs (review generated prompts/insights)
3. Iteration based on what actually feels valuable
