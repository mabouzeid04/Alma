# Feature: ChatGPT Import

## Overview

**What**: Allow users to import their ChatGPT conversation history to bootstrap their personal knowledge base, extract patterns, and create searchable memory nodes from personally relevant conversations.

**Why**: New users face a "cold start" problem - Alma knows nothing about them. Importing existing ChatGPT conversations (which many users have accumulated over months/years) provides rich data about who the user is, their recurring concerns, and how they think - without requiring weeks of journaling sessions.

**Philosophy**: Smart filtering over bulk import. ChatGPT is used for many purposes (code, homework, random questions). Only personally relevant conversations (self-reflection, life events, relationships, goals) should be imported. The LLM classifies each conversation's relevance before deep analysis.

---

## User Flow

```
Settings Hub
    │
    └── Import Data → Import ChatGPT
                          │
                          ▼
                   ┌──────────────────┐
                   │   File Picker    │
                   │  (conversations  │
                   │     .json)       │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   Processing     │
                   │  (with progress) │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Review Screen   │
                   │ (item-by-item)   │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │    Complete!     │
                   │   Summary view   │
                   └──────────────────┘
```

---

## Entry Point: Settings Hub

Add to the Settings Hub (`app/app/settings.tsx`) under a new "IMPORT" section:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back              Settings                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ABOUT YOU                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🧠  Personal Knowledge                            →    ││
│  │     Facts the AI remembers about you                   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔄  Patterns                                  3   →    ││
│  │     Recurring themes the AI has noticed                ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💡  Theories                                  2   →    ││
│  │     Deeper hypotheses about you                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  IMPORT                                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📥  Import ChatGPT Data                           →    ││
│  │     Analyze your ChatGPT history                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  APP                                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚙️  Preferences                                   →    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen 1: Import Instructions

`app/app/settings/import-chatgpt.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings        Import ChatGPT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        📥                                   │
│                                                             │
│              Import Your ChatGPT History                    │
│                                                             │
│  Upload your ChatGPT export to help Alma understand you     │
│  from day one. We'll scan for personal conversations and    │
│  extract insights while ignoring code, homework, and        │
│  other noise.                                               │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  How to export from ChatGPT:                                │
│                                                             │
│  1. Go to chat.openai.com                                   │
│  2. Settings → Data Controls → Export Data                  │
│  3. Click "Export" and wait for email                       │
│  4. Download the ZIP, extract it                            │
│  5. Find conversations.json inside                          │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│              [ Select conversations.json ]                  │
│                                                             │
│                                                             │
│  ⚠️ Large exports may take several minutes to process       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Tap "Select conversations.json" → opens file picker
- Only accepts `.json` files
- On file selected → navigate to processing screen

---

## Screen 2: Processing

`app/app/settings/import-chatgpt-processing.tsx`

Shows progress as the import runs through multiple phases:

```
┌─────────────────────────────────────────────────────────────┐
│                  Analyzing Your History                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│                        ████████░░░░░░                       │
│                           54%                               │
│                                                             │
│                                                             │
│  Phase 2 of 4: Classifying conversations                    │
│                                                             │
│  ├─ Scanned 312 conversations                     ✓         │
│  ├─ Classifying relevance...               47 of 312        │
│  ├─ Deep analysis                              pending      │
│  └─ Extracting insights                        pending      │
│                                                             │
│                                                             │
│  Found so far:                                              │
│  • 18 personal conversations                                │
│  • 23 facts detected                                        │
│  • 4 potential patterns                                     │
│                                                             │
│                                                             │
│                   ~3 minutes remaining                      │
│                                                             │
│                                                             │
│                       [ Cancel ]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Processing Phases:**

| Phase | Description | Output |
|-------|-------------|--------|
| 1. Parse | Read JSON, linearize chat trees | Conversation list |
| 2. Classify | LLM scores each conversation 0-10 | Relevant conversations (score ≥ 6) |
| 3. Analyze | Deep extraction on relevant chats | Facts, patterns, memory content |
| 4. Prepare | Structure data for review | Review items |

**Progress Calculation:**
- Phase 1: 5% (quick)
- Phase 2: 40% (bulk of work - many LLM calls)
- Phase 3: 45% (fewer but deeper LLM calls)
- Phase 4: 10% (structuring)

**Time Estimation:**
- Base: 1 second per conversation for classification
- Deep analysis: 3 seconds per relevant conversation
- Update estimate as actual timings collected

---

## Screen 3: Review

`app/app/settings/import-chatgpt-review.tsx`

Item-by-item review of extracted insights. User can accept or reject each item.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back            Review Insights                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Review what we found. Accept or reject each item.          │
│                                                             │
│  Progress: 12 of 47                      [ Accept All ]     │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    PERSONAL FACT                        ││
│  │                                                         ││
│  │  "Has a younger sister named Sarah who lives           ││
│  │   in Boston"                                            ││
│  │                                                         ││
│  │                                                         ││
│  │      [ Reject ]                    [ Accept ✓ ]         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                                                             │
│  Up next:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ PATTERN: Career uncertainty                           │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ FACT: Works as a product manager                      │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ MEMORY: Difficult conversation with Dad...            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Review Item Types:**

### 1. Personal Facts
```
┌─────────────────────────────────────────────────────────────┐
│                    PERSONAL FACT                            │
│                                                             │
│  "Works as a product manager at a fintech startup"         │
│                                                             │
│  Category: Career                                           │
│                                                             │
│      [ Reject ]                    [ Accept ✓ ]             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Patterns
```
┌─────────────────────────────────────────────────────────────┐
│                      PATTERN                                │
│                                                             │
│  Career Uncertainty                                         │
│                                                             │
│  "Recurring theme of questioning career path. Multiple     │
│  conversations about whether product management is the     │
│  right fit, interest in switching to engineering."         │
│                                                             │
│  Found in 4 conversations over 3 months                    │
│                                                             │
│      [ Reject ]                    [ Accept ✓ ]             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Memory Nodes (from relevant conversations)
```
┌─────────────────────────────────────────────────────────────┐
│                  CONVERSATION MEMORY                        │
│                                                             │
│  Difficult Conversation with Dad                            │
│  March 15, 2024                                             │
│                                                             │
│  "Talked through a tense conversation with Dad about       │
│  career choices. Feeling pressure to follow a traditional  │
│  path. Expressed frustration about not being understood."  │
│                                                             │
│  Topics: Family, Career, Conflict                           │
│  Emotions: Frustrated, Misunderstood, Determined           │
│                                                             │
│      [ Reject ]                    [ Accept ✓ ]             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Swipe left = Reject, Swipe right = Accept (optional gesture support)
- Tap Accept/Reject buttons
- "Accept All" button for users who trust the extraction
- Progress indicator shows items remaining
- Back button → confirmation dialog ("Discard unreviewed items?")

---

## Screen 4: Completion

`app/app/settings/import-chatgpt-complete.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                    Import Complete!                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         ✓                                   │
│                                                             │
│            Your history has been imported                   │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  Summary                                                    │
│                                                             │
│  312 conversations scanned                                  │
│   └─ 23 personally relevant                                 │
│                                                             │
│  47 insights extracted                                      │
│   ├─ 34 personal facts added                               │
│   ├─ 8 patterns detected                                   │
│   └─ 12 conversation memories saved                        │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  Alma now knows more about you. Start a conversation       │
│  and see the difference!                                    │
│                                                             │
│              [ Start Journaling ]                           │
│                                                             │
│                   [ Back to Settings ]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### ChatGPT Export Format (Input)

Based on actual ChatGPT export analysis (verified against real export):

```typescript
// conversations.json structure
type ChatGPTExport = ChatGPTConversation[];

interface ChatGPTConversation {
  title: string;
  create_time: number;  // Unix timestamp (seconds, float)
  update_time: number;
  current_node: string; // UUID of leaf node (active thread)
  mapping: {
    [uuid: string]: ChatGPTMessageNode;
  };
}

interface ChatGPTMessageNode {
  id: string;
  parent: string | null;
  children: string[];
  message: ChatGPTMessage | null;  // null for routing/system nodes
}

interface ChatGPTMessage {
  id: string;
  author: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    name: string | null;
    metadata: Record<string, unknown>;
  };
  create_time: number | null;
  update_time: number | null;
  content: ChatGPTContent;
  status: string;           // 'finished_successfully', etc.
  end_turn: boolean;
  weight: number;
  metadata: {
    is_visually_hidden_from_conversation?: boolean;
    // ... other metadata
  };
  recipient: string;        // 'all', etc.
  channel: string | null;
}

// Content types found in real exports
type ChatGPTContent =
  | { content_type: 'text'; parts: string[] }
  | { content_type: 'multimodal_text'; parts: (string | ImagePart)[] }
  | { content_type: 'code'; text: string }
  | { content_type: 'execution_output'; text: string }
  | { content_type: 'tether_browsing_display'; result: string }
  | { content_type: 'thoughts'; parts: string[] }           // o1 model thinking
  | { content_type: 'reasoning_recap'; parts: string[] }    // o1 model summary
  | { content_type: 'image_asset_pointer'; /* ... */ }
  | { content_type: 'user_editable_context'; user_profile: string; user_instructions: string };

interface ImagePart {
  asset_pointer: string;
  // ... other image metadata
}
```

### Bonus: User Profile Extraction

The `user_editable_context` content type contains the user's ChatGPT custom instructions - a goldmine of pre-written personal facts! Example from real export:

```
User profile:
Preferred name: Mahmoud
Role: AI Product Manager
Other Information: I'm a 21 year old international student from egypt.
I'm a CS student at UCSD...
```

**Strategy**: Parse the first conversation's `user_editable_context` to extract these facts directly - no LLM needed!
```

### Import Session Table (New)

Track import jobs for resumability and history:

```sql
CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- 'chatgpt'
  status TEXT NOT NULL,           -- 'processing' | 'reviewing' | 'completed' | 'cancelled'
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,

  -- Progress tracking
  total_conversations INTEGER,
  processed_conversations INTEGER DEFAULT 0,
  relevant_conversations INTEGER DEFAULT 0,

  -- Results (populated during processing)
  extracted_facts TEXT,           -- JSON array of pending facts
  extracted_patterns TEXT,        -- JSON array of pending patterns
  extracted_memories TEXT,        -- JSON array of pending memory nodes

  -- Review progress
  reviewed_count INTEGER DEFAULT 0,
  accepted_facts INTEGER DEFAULT 0,
  accepted_patterns INTEGER DEFAULT 0,
  accepted_memories INTEGER DEFAULT 0,

  -- Timestamps
  started_at TEXT NOT NULL,
  completed_at TEXT,

  -- Error handling
  error_message TEXT,
  last_processed_index INTEGER DEFAULT 0  -- For resumability
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions (status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_started ON import_sessions (started_at DESC);
```

### Extended Personal Facts

Add source tracking to existing personal_knowledge or create new table:

```sql
-- Option A: Add column to existing table (if it supports it)
-- Option B: Create enhanced personal_facts table

CREATE TABLE IF NOT EXISTS personal_facts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT,                  -- 'biographical' | 'relationship' | 'preference' | 'goal' | 'habit' | 'belief'
  source TEXT NOT NULL,           -- 'conversation' | 'chatgpt_import' | 'manual'
  source_reference TEXT,          -- session_id or import_session_id
  confidence REAL DEFAULT 0.8,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_facts_source ON personal_facts (source);
CREATE INDEX IF NOT EXISTS idx_personal_facts_category ON personal_facts (category);
CREATE INDEX IF NOT EXISTS idx_personal_facts_active ON personal_facts (active);
```

### TypeScript Interfaces

```typescript
// Import session tracking
interface ImportSession {
  id: string;
  source: 'chatgpt';
  status: 'processing' | 'reviewing' | 'completed' | 'cancelled';
  fileName: string;
  fileSizeBytes?: number;

  // Progress
  totalConversations: number;
  processedConversations: number;
  relevantConversations: number;

  // Extracted data (pending review)
  extractedFacts: PendingFact[];
  extractedPatterns: PendingPattern[];
  extractedMemories: PendingMemory[];

  // Review progress
  reviewedCount: number;
  acceptedFacts: number;
  acceptedPatterns: number;
  acceptedMemories: number;

  // Timestamps
  startedAt: Date;
  completedAt?: Date;

  // Error handling
  errorMessage?: string;
  lastProcessedIndex: number;
}

// Items pending review
interface PendingFact {
  id: string;
  content: string;
  category: FactCategory;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PendingPattern {
  id: string;
  patternType: PatternType;
  description: string;
  subject?: string;
  evidenceConversations: string[];  // ChatGPT conversation titles
  status: 'pending' | 'accepted' | 'rejected';
}

interface PendingMemory {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  emotions: string[];
  originalDate: Date;
  conversationTitle: string;
  status: 'pending' | 'accepted' | 'rejected';
}

type FactCategory =
  | 'biographical'    // Name, age, location, job
  | 'relationship'    // People in their life
  | 'preference'      // Likes, dislikes, opinions
  | 'goal'            // Aspirations, plans
  | 'habit'           // Behavioral patterns
  | 'belief';         // Values, worldview

// Review item (union type for UI)
type ReviewItem =
  | { type: 'fact'; data: PendingFact }
  | { type: 'pattern'; data: PendingPattern }
  | { type: 'memory'; data: PendingMemory };
```

---

## Processing Pipeline

### Pipeline Overview

```
conversations.json
        │
        ▼
┌───────────────────┐
│  0. EXTRACT       │  Parse user_editable_context for
│     PROFILE       │  pre-written personal facts (instant!)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  1. PARSE         │  Read JSON, handle large files
│     & LINEARIZE   │  Convert tree structure to linear chats
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  2. CLASSIFY      │  LLM scores each conversation 0-10
│     (batch)       │  Filter to relevant only (≥6)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  3. DEEP ANALYZE  │  Extract facts, patterns, memories
│     (per chat)    │  from each relevant conversation
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  4. DEDUPLICATE   │  Merge similar facts
│     & PREPARE     │  Consolidate patterns
└─────────┬─────────┘
          │
          ▼
     Review Items
```

### Phase 0: Extract User Profile (Instant Win)

Before any LLM calls, extract the user's ChatGPT custom instructions. This is free structured data!

```typescript
interface ExtractedProfile {
  rawText: string;
  parsedFacts: {
    content: string;
    category: FactCategory;
    confidence: number;
  }[];
}

async function extractProfileFacts(
  conversations: ChatGPTConversation[]
): Promise<ExtractedProfile | null> {
  const profileText = extractUserProfile(conversations);
  if (!profileText) return null;

  // Parse structured profile (often has key: value format)
  const facts: ExtractedProfile['parsedFacts'] = [];

  // Common patterns in ChatGPT profiles
  const patterns = [
    { regex: /preferred name:\s*(.+)/i, category: 'biographical' as const },
    { regex: /name:\s*(.+)/i, category: 'biographical' as const },
    { regex: /role:\s*(.+)/i, category: 'biographical' as const },
    { regex: /(?:i(?:'m| am))\s+(?:a\s+)?(\d+)\s*(?:year[s]?\s*old|yo)/i, category: 'biographical' as const },
    { regex: /(?:from|live[s]? in|based in)\s+([A-Za-z\s,]+)/i, category: 'biographical' as const },
    { regex: /(?:student at|studying at|attend)\s+([A-Za-z\s]+)/i, category: 'biographical' as const },
    { regex: /(?:work(?:ing)? (?:at|for)|employed at)\s+([A-Za-z\s]+)/i, category: 'biographical' as const },
    { regex: /(?:interested in|passionate about)\s+([^.]+)/i, category: 'preference' as const },
    { regex: /mbti[:\s]+([A-Z]{4})/i, category: 'preference' as const },
  ];

  for (const { regex, category } of patterns) {
    const match = profileText.match(regex);
    if (match) {
      facts.push({
        content: match[0].trim(),
        category,
        confidence: 0.95,  // High confidence - user wrote this themselves
      });
    }
  }

  // Also use LLM to extract any facts the regex missed
  if (profileText.length > 50) {
    const llmFacts = await extractFactsFromProfile(profileText);
    facts.push(...llmFacts);
  }

  return {
    rawText: profileText,
    parsedFacts: deduplicateFacts(facts),
  };
}
```

**Example extraction from real profile:**
```
Input: "Preferred name: Mahmoud
Role: AI Product Manager
Other Information: I'm a 21 year old international student from egypt.
I'm a CS student at UCSD and interning at microsoft..."

Output facts:
- "Preferred name is Mahmoud" (biographical, 0.95)
- "Works as AI Product Manager" (biographical, 0.95)
- "21 years old" (biographical, 0.95)
- "International student from Egypt" (biographical, 0.95)
- "CS student at UCSD" (biographical, 0.95)
- "Interning at Microsoft" (biographical, 0.95)
```

### Phase 1: Parse & Linearize

Handle ChatGPT's tree structure (branching conversations):

```typescript
interface LinearizedConversation {
  id: string;
  title: string;
  createdAt: Date;
  messages: LinearizedMessage[];
  wordCount: number;
}

interface LinearizedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

async function parseAndLinearize(
  fileUri: string,
  onProgress: (count: number) => void
): Promise<LinearizedConversation[]> {
  // Read file (handle large files with streaming if needed)
  const content = await FileSystem.readAsStringAsync(fileUri);
  const conversations: ChatGPTConversation[] = JSON.parse(content);

  const result: LinearizedConversation[] = [];

  for (const conv of conversations) {
    onProgress(result.length);

    // Follow the current_node path to get the active thread
    const messages = linearizeConversation(conv);

    // Skip empty or very short conversations
    if (messages.length < 2) continue;

    const wordCount = messages.reduce(
      (sum, m) => sum + m.content.split(/\s+/).length,
      0
    );

    result.push({
      id: conv.current_node || uuidv4(),
      title: conv.title || 'Untitled',
      createdAt: new Date(conv.create_time * 1000),
      messages,
      wordCount,
    });
  }

  // Sort by date (most recent first for processing limit)
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return result;
}

function linearizeConversation(conv: ChatGPTConversation): LinearizedMessage[] {
  const messages: LinearizedMessage[] = [];

  // Find the leaf node and walk backwards to root
  let currentId = conv.current_node;
  const path: string[] = [];

  while (currentId) {
    path.unshift(currentId);
    const node = conv.mapping[currentId];
    currentId = node?.parent || null;
  }

  // Walk forward through path, collecting messages
  for (const nodeId of path) {
    const node = conv.mapping[nodeId];
    if (!node?.message) continue;

    const msg = node.message;

    // Skip hidden system messages
    if (msg.metadata?.is_visually_hidden_from_conversation) continue;

    // Only process user and assistant messages
    if (msg.author.role !== 'user' && msg.author.role !== 'assistant') continue;

    // Extract text content based on content_type
    let content = '';
    const contentType = msg.content.content_type;

    if (contentType === 'text' || contentType === 'multimodal_text') {
      // Standard text content
      content = msg.content.parts
        .filter((part): part is string => typeof part === 'string')
        .join('\n')
        .trim();
    } else if (contentType === 'user_editable_context') {
      // Skip - this is profile/instructions, handled separately
      continue;
    } else if (contentType === 'code' || contentType === 'execution_output') {
      // Skip code - not relevant for personal analysis
      continue;
    } else if (contentType === 'tether_browsing_display') {
      // Skip web browsing results
      continue;
    } else if (contentType === 'thoughts' || contentType === 'reasoning_recap') {
      // Skip o1 model internal reasoning
      continue;
    } else if (contentType === 'image_asset_pointer') {
      // Skip images - can't analyze
      continue;
    }

    if (!content) continue;

    messages.push({
      role: msg.author.role,
      content,
      timestamp: msg.create_time ? new Date(msg.create_time * 1000) : new Date(conv.create_time * 1000),
    });
  }

  return messages;
}

// Extract user profile from first conversation's user_editable_context
function extractUserProfile(conversations: ChatGPTConversation[]): string | null {
  for (const conv of conversations) {
    for (const node of Object.values(conv.mapping)) {
      const msg = node.message;
      if (!msg) continue;
      if (msg.content.content_type !== 'user_editable_context') continue;

      const profile = (msg.content as any).user_profile;
      if (profile && typeof profile === 'string') {
        // Parse the profile text - it's structured like:
        // "The user provided the following information...
        //  User profile:
        //  ```Preferred name: X\nRole: Y\n...```"
        const match = profile.match(/```([\s\S]*?)```/);
        if (match) {
          return match[1].trim();
        }
        return profile;
      }
    }
  }
  return null;
}
```

### Phase 2: Classify Relevance

Batch conversations to the LLM for relevance scoring:

```typescript
interface ClassificationResult {
  conversationId: string;
  score: number;        // 0-10
  category: string;     // 'personal' | 'code' | 'homework' | 'factual' | 'creative' | 'other'
  reasoning: string;
}

async function classifyConversations(
  conversations: LinearizedConversation[],
  onProgress: (processed: number, relevant: number) => void,
  signal?: AbortSignal
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];

  // Process in batches of 10 for efficiency
  const BATCH_SIZE = 10;

  for (let i = 0; i < conversations.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Cancelled');

    const batch = conversations.slice(i, i + BATCH_SIZE);
    const batchResults = await classifyBatch(batch, signal);
    results.push(...batchResults);

    const relevantCount = results.filter(r => r.score >= 6).length;
    onProgress(results.length, relevantCount);
  }

  return results;
}

async function classifyBatch(
  conversations: LinearizedConversation[],
  signal?: AbortSignal
): Promise<ClassificationResult[]> {
  const prompt = buildClassificationPrompt(conversations);
  const response = await runPromptWithModel(prompt, getModelPref(), signal, {
    temperature: 0.2,
    maxTokens: 2000,
  });

  return parseClassificationResponse(response, conversations);
}
```

**Classification Prompt:**

```
You are analyzing ChatGPT conversations to identify which ones contain personal, self-reflective content relevant to a journaling app.

CONVERSATIONS TO CLASSIFY:

${conversations.map((c, i) => `
---
CONVERSATION ${i + 1}: "${c.title}"
Date: ${c.createdAt.toLocaleDateString()}
Word count: ${c.wordCount}

Preview (first 500 chars of user messages):
${c.messages.filter(m => m.role === 'user').map(m => m.content).join('\n').slice(0, 500)}
---
`).join('\n')}

For each conversation, provide:
1. A relevance score from 0-10:
   - 0-3: Not relevant (code, homework, factual questions, creative writing prompts)
   - 4-5: Marginally relevant (some personal context but primarily task-focused)
   - 6-7: Relevant (discusses personal life, feelings, relationships, goals)
   - 8-10: Highly relevant (deep self-reflection, journaling, emotional processing)

2. A category:
   - 'personal': Self-reflection, life events, relationships, emotions, goals
   - 'code': Programming, debugging, technical implementation
   - 'homework': Academic assignments, study help
   - 'factual': General knowledge questions, definitions, explanations
   - 'creative': Writing prompts, story creation, brainstorming
   - 'other': Everything else

3. Brief reasoning (1 sentence)

CRITICAL: We ONLY want conversations where the user is talking about THEMSELVES, their LIFE, their FEELINGS, their RELATIONSHIPS, or their GOALS. Be strict - most ChatGPT conversations are NOT relevant.

OUTPUT FORMAT (JSON array):
[
  {
    "index": 1,
    "score": 7,
    "category": "personal",
    "reasoning": "User discusses frustration with their manager and feeling undervalued at work"
  },
  {
    "index": 2,
    "score": 2,
    "category": "code",
    "reasoning": "Technical discussion about React state management"
  }
]
```

### Phase 3: Deep Analysis

For each relevant conversation, extract structured insights:

```typescript
interface DeepAnalysisResult {
  conversationId: string;

  // Personal facts found
  facts: {
    content: string;
    category: FactCategory;
    confidence: number;
  }[];

  // Patterns suggested (may span multiple conversations)
  patternHints: {
    type: PatternType;
    description: string;
    subject?: string;
  }[];

  // Memory node content
  memory: {
    summary: string;
    topics: string[];
    emotions: string[];
    events: string[];
    peopleMentioned: string[];
    unresolvedQuestions: string[];
  };
}

async function analyzeConversation(
  conversation: LinearizedConversation,
  signal?: AbortSignal
): Promise<DeepAnalysisResult> {
  const prompt = buildAnalysisPrompt(conversation);
  const response = await runPromptWithModel(prompt, getModelPref(), signal, {
    temperature: 0.3,
    maxTokens: 3000,
  });

  return parseAnalysisResponse(response, conversation.id);
}
```

**Deep Analysis Prompt:**

```
You are analyzing a personal conversation to extract insights for a journaling app's memory system.

CONVERSATION: "${conversation.title}"
Date: ${conversation.createdAt.toLocaleDateString()}

FULL TRANSCRIPT:
${conversation.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

---

Extract the following:

## 1. PERSONAL FACTS

Identify specific facts about the user that would be useful to remember long-term.

Categories:
- biographical: Name, age, location, occupation, education
- relationship: People in their life (family, friends, partners, colleagues) with context
- preference: Strong opinions, likes, dislikes, values
- goal: Things they want to achieve, plans, aspirations
- habit: Regular behaviors, routines, tendencies
- belief: Worldview, principles, philosophies

For each fact:
- State it as a clear, standalone statement
- Be specific (include names, places, details when mentioned)
- Only include facts explicitly stated or strongly implied
- Assign confidence: 0.9 for explicit statements, 0.7 for strong implications

## 2. PATTERN HINTS

Identify themes that might indicate recurring patterns if seen across multiple conversations:
- Emotional tendencies (e.g., "gets anxious about deadlines")
- Relationship dynamics (e.g., "conflict avoidance with family")
- Decision-making patterns (e.g., "overthinks major choices")
- Unresolved questions (e.g., "keeps questioning career path")

Note: These are HINTS from a single conversation. They become patterns only if confirmed across multiple conversations.

## 3. MEMORY SUMMARY

Create a structured summary of this conversation as a memory node:
- summary: 2-3 sentence overview of what was discussed
- topics: Key themes (array of strings)
- emotions: Emotional states expressed (array of strings)
- events: Specific events mentioned (array of strings)
- people_mentioned: Names of people discussed (array of strings)
- unresolved_questions: Questions or decisions left open (array of strings)

---

OUTPUT FORMAT (JSON):
{
  "facts": [
    {
      "content": "Has a sister named Sarah who lives in Boston",
      "category": "relationship",
      "confidence": 0.9
    }
  ],
  "pattern_hints": [
    {
      "type": "emotional_trend",
      "description": "Expresses anxiety when discussing work deadlines",
      "subject": "work stress"
    }
  ],
  "memory": {
    "summary": "User discussed feeling overwhelmed at work and questioning if their job is the right fit. Mentioned a supportive conversation with their partner.",
    "topics": ["career", "stress", "relationship"],
    "emotions": ["overwhelmed", "uncertain", "supported"],
    "events": ["deadline pressure at work", "conversation with partner"],
    "people_mentioned": ["Sarah (partner)"],
    "unresolved_questions": ["Should I look for a new job?"]
  }
}

IMPORTANT:
- Only include facts that are actually present in the conversation
- Be precise with names and details
- Don't invent or assume information not stated
- If the conversation is shallow or lacks personal depth, return minimal results
```

### Phase 4: Deduplicate & Prepare

Consolidate results across all analyzed conversations:

```typescript
async function prepareReviewItems(
  analysisResults: DeepAnalysisResult[],
  signal?: AbortSignal
): Promise<ReviewItem[]> {
  const items: ReviewItem[] = [];

  // 1. Deduplicate facts
  const allFacts = analysisResults.flatMap(r => r.facts);
  const uniqueFacts = deduplicateFacts(allFacts);

  for (const fact of uniqueFacts) {
    items.push({
      type: 'fact',
      data: {
        id: uuidv4(),
        content: fact.content,
        category: fact.category,
        status: 'pending',
      },
    });
  }

  // 2. Consolidate pattern hints into patterns
  const allHints = analysisResults.flatMap(r => r.patternHints);
  const consolidatedPatterns = await consolidatePatterns(allHints, signal);

  for (const pattern of consolidatedPatterns) {
    items.push({
      type: 'pattern',
      data: {
        id: uuidv4(),
        patternType: pattern.type,
        description: pattern.description,
        subject: pattern.subject,
        evidenceConversations: pattern.sources,
        status: 'pending',
      },
    });
  }

  // 3. Create memory nodes from analysis results
  for (const result of analysisResults) {
    const conv = getConversationById(result.conversationId);
    items.push({
      type: 'memory',
      data: {
        id: uuidv4(),
        title: conv.title,
        summary: result.memory.summary,
        topics: result.memory.topics,
        emotions: result.memory.emotions,
        originalDate: conv.createdAt,
        conversationTitle: conv.title,
        status: 'pending',
      },
    });
  }

  // Sort: patterns first (most impactful), then facts, then memories
  items.sort((a, b) => {
    const order = { pattern: 0, fact: 1, memory: 2 };
    return order[a.type] - order[b.type];
  });

  return items;
}

function deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
  // Group by semantic similarity
  // For MVP: simple text matching
  // For production: use embeddings

  const unique: ExtractedFact[] = [];

  for (const fact of facts) {
    const isDuplicate = unique.some(existing =>
      levenshteinSimilarity(existing.content, fact.content) > 0.8
    );

    if (!isDuplicate) {
      unique.push(fact);
    }
  }

  return unique;
}

async function consolidatePatterns(
  hints: PatternHint[],
  signal?: AbortSignal
): Promise<ConsolidatedPattern[]> {
  // Group hints by subject/type
  // If 2+ conversations mention similar pattern, create a consolidated pattern
  // Use LLM to merge similar hints into coherent patterns

  const grouped = groupBy(hints, h => `${h.type}:${h.subject || 'general'}`);
  const patterns: ConsolidatedPattern[] = [];

  for (const [key, group] of Object.entries(grouped)) {
    if (group.length < 2) continue;  // Need at least 2 mentions

    // Use LLM to synthesize into a single pattern
    const consolidated = await synthesizePattern(group, signal);
    patterns.push(consolidated);
  }

  return patterns;
}
```

---

## Processing Limits

To prevent excessive API calls and long processing times:

```typescript
const IMPORT_LIMITS = {
  // Maximum conversations to process (most recent)
  MAX_CONVERSATIONS: 500,

  // Maximum relevant conversations for deep analysis
  MAX_RELEVANT_FOR_ANALYSIS: 50,

  // Classification batch size
  CLASSIFICATION_BATCH_SIZE: 10,

  // Warn user if file exceeds this size (bytes)
  LARGE_FILE_WARNING_SIZE: 50 * 1024 * 1024,  // 50MB

  // Abort if file exceeds this size
  MAX_FILE_SIZE: 200 * 1024 * 1024,  // 200MB
};
```

When limits are hit:
- Show user message: "Your history is large! We'll analyze the 500 most recent conversations."
- Process most recent first (likely most relevant to current self)

---

## Saving Accepted Items

When user accepts items during review:

```typescript
async function saveAcceptedItems(
  importSession: ImportSession
): Promise<ImportSummary> {
  const db = await getDatabase();

  let factsSaved = 0;
  let patternsSaved = 0;
  let memoriesSaved = 0;

  // 1. Save accepted facts
  for (const item of importSession.extractedFacts) {
    if (item.status !== 'accepted') continue;

    await db.runAsync(
      `INSERT INTO personal_facts (id, content, category, source, source_reference, confidence, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.content,
        item.category,
        'chatgpt_import',
        importSession.id,
        0.8,
        1,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    factsSaved++;
  }

  // 2. Save accepted patterns
  for (const item of importSession.extractedPatterns) {
    if (item.status !== 'accepted') continue;

    await createPattern({
      id: item.id,
      patternType: item.patternType,
      description: item.description,
      subject: item.subject,
      firstObserved: new Date(),
      lastUpdated: new Date(),
      relatedSessions: [],  // No session IDs (imported from ChatGPT)
      evidenceQuotes: [],
      confidence: 0.5,  // Lower confidence for imported patterns
      status: 'active',
      createdAt: new Date(),
      metadata: {
        source: 'chatgpt_import',
        importSessionId: importSession.id,
        evidenceConversations: item.evidenceConversations,
      },
    });
    patternsSaved++;
  }

  // 3. Save accepted memories as special memory nodes
  for (const item of importSession.extractedMemories) {
    if (item.status !== 'accepted') continue;

    // Create a synthetic session for the memory node
    const syntheticSessionId = `imported-${item.id}`;

    await db.runAsync(
      `INSERT INTO sessions (id, started_at, ended_at, transcript, duration, word_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        syntheticSessionId,
        item.originalDate.toISOString(),
        item.originalDate.toISOString(),
        `[Imported from ChatGPT: ${item.conversationTitle}]`,
        0,
        0,
      ]
    );

    // Create memory node with embedding
    const embedding = await generateEmbedding(item.summary);

    await db.runAsync(
      `INSERT INTO memory_nodes (id, session_id, created_at, summary, topics, emotions, events, people_mentioned, thoughts, unresolved_questions, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        syntheticSessionId,
        item.originalDate.toISOString(),
        item.summary,
        JSON.stringify(item.topics),
        JSON.stringify(item.emotions),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(embedding),
      ]
    );
    memoriesSaved++;
  }

  // 4. Update import session status
  await updateImportSession(importSession.id, {
    status: 'completed',
    completedAt: new Date(),
    acceptedFacts: factsSaved,
    acceptedPatterns: patternsSaved,
    acceptedMemories: memoriesSaved,
  });

  return {
    totalConversations: importSession.totalConversations,
    relevantConversations: importSession.relevantConversations,
    factsSaved,
    patternsSaved,
    memoriesSaved,
  };
}
```

---

## Service: `chatgpt-import.ts`

New service file: `app/src/services/chatgpt-import.ts`

```typescript
/**
 * ChatGPT Import Service
 *
 * Handles importing and analyzing ChatGPT conversation exports to bootstrap
 * the user's personal knowledge base, patterns, and memory nodes.
 */

import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { runPromptWithModel, generateEmbedding } from './ai';
import * as db from './database';
import { createPattern } from './patterns';

// Types
export interface ImportProgress {
  phase: 'parsing' | 'classifying' | 'analyzing' | 'preparing';
  phaseProgress: number;  // 0-100
  totalProgress: number;  // 0-100

  conversationsScanned: number;
  conversationsClassified: number;
  relevantFound: number;

  factsExtracted: number;
  patternsDetected: number;
  memoriesCreated: number;

  estimatedSecondsRemaining: number;
}

export interface ImportResult {
  success: boolean;
  importSessionId: string;
  reviewItems: ReviewItem[];
  error?: string;
}

export interface ImportSummary {
  totalConversations: number;
  relevantConversations: number;
  factsSaved: number;
  patternsSaved: number;
  memoriesSaved: number;
}

// Main import function
export async function importChatGPTExport(
  fileUri: string,
  onProgress: (progress: ImportProgress) => void,
  signal?: AbortSignal
): Promise<ImportResult> {
  const importSessionId = uuidv4();

  try {
    // Create import session record
    await createImportSession(importSessionId, fileUri);

    // Phase 1: Parse & Linearize
    onProgress(createProgress('parsing', 0, 0));
    const conversations = await parseAndLinearize(
      fileUri,
      (count) => onProgress(createProgress('parsing', (count / 500) * 100, 5))
    );

    // Apply limits
    const limitedConversations = conversations.slice(0, IMPORT_LIMITS.MAX_CONVERSATIONS);

    // Phase 2: Classify
    onProgress(createProgress('classifying', 0, 5));
    const classifications = await classifyConversations(
      limitedConversations,
      (processed, relevant) => onProgress(createProgress(
        'classifying',
        (processed / limitedConversations.length) * 100,
        5 + (processed / limitedConversations.length) * 40,
        { conversationsClassified: processed, relevantFound: relevant }
      )),
      signal
    );

    // Filter to relevant only
    const relevantIds = new Set(
      classifications
        .filter(c => c.score >= 6)
        .map(c => c.conversationId)
    );
    const relevantConversations = limitedConversations
      .filter(c => relevantIds.has(c.id))
      .slice(0, IMPORT_LIMITS.MAX_RELEVANT_FOR_ANALYSIS);

    // Phase 3: Deep Analysis
    onProgress(createProgress('analyzing', 0, 45));
    const analysisResults: DeepAnalysisResult[] = [];

    for (let i = 0; i < relevantConversations.length; i++) {
      if (signal?.aborted) throw new Error('Cancelled');

      const result = await analyzeConversation(relevantConversations[i], signal);
      analysisResults.push(result);

      onProgress(createProgress(
        'analyzing',
        ((i + 1) / relevantConversations.length) * 100,
        45 + ((i + 1) / relevantConversations.length) * 45,
        {
          factsExtracted: analysisResults.flatMap(r => r.facts).length,
          patternsDetected: analysisResults.flatMap(r => r.patternHints).length,
        }
      ));
    }

    // Phase 4: Prepare Review Items
    onProgress(createProgress('preparing', 0, 90));
    const reviewItems = await prepareReviewItems(analysisResults, signal);
    onProgress(createProgress('preparing', 100, 100));

    // Update import session
    await updateImportSession(importSessionId, {
      status: 'reviewing',
      totalConversations: limitedConversations.length,
      relevantConversations: relevantConversations.length,
      extractedFacts: reviewItems.filter(i => i.type === 'fact').map(i => i.data),
      extractedPatterns: reviewItems.filter(i => i.type === 'pattern').map(i => i.data),
      extractedMemories: reviewItems.filter(i => i.type === 'memory').map(i => i.data),
    });

    return {
      success: true,
      importSessionId,
      reviewItems,
    };

  } catch (error) {
    await updateImportSession(importSessionId, {
      status: 'cancelled',
      errorMessage: error.message,
    });

    return {
      success: false,
      importSessionId,
      reviewItems: [],
      error: error.message,
    };
  }
}

// Review item actions
export async function updateReviewItemStatus(
  importSessionId: string,
  itemId: string,
  itemType: 'fact' | 'pattern' | 'memory',
  status: 'accepted' | 'rejected'
): Promise<void> {
  const session = await getImportSession(importSessionId);
  if (!session) throw new Error('Import session not found');

  const updateArray = (items: any[]) =>
    items.map(i => i.id === itemId ? { ...i, status } : i);

  if (itemType === 'fact') {
    session.extractedFacts = updateArray(session.extractedFacts);
  } else if (itemType === 'pattern') {
    session.extractedPatterns = updateArray(session.extractedPatterns);
  } else {
    session.extractedMemories = updateArray(session.extractedMemories);
  }

  session.reviewedCount++;

  await updateImportSession(importSessionId, session);
}

export async function acceptAllRemaining(
  importSessionId: string
): Promise<void> {
  const session = await getImportSession(importSessionId);
  if (!session) throw new Error('Import session not found');

  session.extractedFacts = session.extractedFacts.map(f =>
    f.status === 'pending' ? { ...f, status: 'accepted' } : f
  );
  session.extractedPatterns = session.extractedPatterns.map(p =>
    p.status === 'pending' ? { ...p, status: 'accepted' } : p
  );
  session.extractedMemories = session.extractedMemories.map(m =>
    m.status === 'pending' ? { ...m, status: 'accepted' } : m
  );

  await updateImportSession(importSessionId, session);
}

export async function finalizeImport(
  importSessionId: string
): Promise<ImportSummary> {
  const session = await getImportSession(importSessionId);
  if (!session) throw new Error('Import session not found');

  return saveAcceptedItems(session);
}

// Database operations for import sessions
export async function createImportSession(id: string, fileUri: string): Promise<void> {
  // Implementation
}

export async function getImportSession(id: string): Promise<ImportSession | null> {
  // Implementation
}

export async function updateImportSession(id: string, updates: Partial<ImportSession>): Promise<void> {
  // Implementation
}
```

---

## Hooks

### `useImportChatGPT.ts`

```typescript
/**
 * Hook for managing ChatGPT import flow
 */

import { useState, useCallback, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  importChatGPTExport,
  updateReviewItemStatus,
  acceptAllRemaining,
  finalizeImport,
  ImportProgress,
  ReviewItem,
  ImportSummary,
} from '@/services/chatgpt-import';

type ImportState =
  | { phase: 'idle' }
  | { phase: 'selecting' }
  | { phase: 'processing'; progress: ImportProgress }
  | { phase: 'reviewing'; items: ReviewItem[]; currentIndex: number; importSessionId: string }
  | { phase: 'complete'; summary: ImportSummary }
  | { phase: 'error'; message: string };

export function useImportChatGPT() {
  const [state, setState] = useState<ImportState>({ phase: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectFile = useCallback(async () => {
    setState({ phase: 'selecting' });

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setState({ phase: 'idle' });
        return;
      }

      const file = result.assets[0];

      // Start processing
      abortControllerRef.current = new AbortController();

      setState({
        phase: 'processing',
        progress: createInitialProgress()
      });

      const importResult = await importChatGPTExport(
        file.uri,
        (progress) => setState({ phase: 'processing', progress }),
        abortControllerRef.current.signal
      );

      if (!importResult.success) {
        setState({ phase: 'error', message: importResult.error || 'Import failed' });
        return;
      }

      if (importResult.reviewItems.length === 0) {
        setState({
          phase: 'complete',
          summary: {
            totalConversations: 0,
            relevantConversations: 0,
            factsSaved: 0,
            patternsSaved: 0,
            memoriesSaved: 0,
          }
        });
        return;
      }

      setState({
        phase: 'reviewing',
        items: importResult.reviewItems,
        currentIndex: 0,
        importSessionId: importResult.importSessionId,
      });

    } catch (error) {
      setState({ phase: 'error', message: error.message });
    }
  }, []);

  const acceptItem = useCallback(async () => {
    if (state.phase !== 'reviewing') return;

    const currentItem = state.items[state.currentIndex];
    await updateReviewItemStatus(
      state.importSessionId,
      currentItem.data.id,
      currentItem.type,
      'accepted'
    );

    moveToNextItem();
  }, [state]);

  const rejectItem = useCallback(async () => {
    if (state.phase !== 'reviewing') return;

    const currentItem = state.items[state.currentIndex];
    await updateReviewItemStatus(
      state.importSessionId,
      currentItem.data.id,
      currentItem.type,
      'rejected'
    );

    moveToNextItem();
  }, [state]);

  const acceptAll = useCallback(async () => {
    if (state.phase !== 'reviewing') return;

    await acceptAllRemaining(state.importSessionId);
    const summary = await finalizeImport(state.importSessionId);
    setState({ phase: 'complete', summary });
  }, [state]);

  const moveToNextItem = useCallback(async () => {
    if (state.phase !== 'reviewing') return;

    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.items.length) {
      // All items reviewed
      const summary = await finalizeImport(state.importSessionId);
      setState({ phase: 'complete', summary });
    } else {
      setState({ ...state, currentIndex: nextIndex });
    }
  }, [state]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({ phase: 'idle' });
  }, []);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  return {
    state,
    selectFile,
    acceptItem,
    rejectItem,
    acceptAll,
    cancel,
    reset,
  };
}
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/src/services/chatgpt-import.ts` | Core import logic, parsing, classification, analysis |
| `app/src/hooks/useImportChatGPT.ts` | State management for import flow |
| `app/app/settings/import-chatgpt.tsx` | Entry screen with instructions |
| `app/app/settings/import-chatgpt-processing.tsx` | Processing progress screen |
| `app/app/settings/import-chatgpt-review.tsx` | Item-by-item review screen |
| `app/app/settings/import-chatgpt-complete.tsx` | Completion summary screen |
| `app/src/components/import/ReviewCard.tsx` | Card component for review items |
| `app/src/components/import/ProgressDisplay.tsx` | Progress visualization component |

### Modified Files

| File | Changes |
|------|---------|
| `app/src/services/database.ts` | Add `import_sessions` table, `personal_facts` table |
| `app/src/types/index.ts` | Add import-related types |
| `app/app/settings.tsx` | Add "Import ChatGPT Data" menu item |
| `app/app/settings/_layout.tsx` | Add routes for import screens |

---

## Integration with Existing Systems

### Personal Knowledge

Currently the app uses a single `personal_knowledge` text blob. The import can either:

**Option A: Append to existing blob**
```typescript
const existingKnowledge = await getPersonalKnowledge();
const newFacts = acceptedFacts.map(f => `- ${f.content}`).join('\n');
await savePersonalKnowledge(existingKnowledge + '\n\n' + newFacts);
```

**Option B: Migrate to structured personal_facts table** (Recommended)
- Create new `personal_facts` table with structured storage
- Migrate existing knowledge blob to individual facts
- All new facts (from sessions AND imports) go to this table
- Build knowledge blob dynamically for AI context

### Patterns System

Imported patterns integrate with existing `patterns` table:
- Use same schema but with lower initial confidence (0.5 vs 0.6)
- Add metadata field for source tracking
- Display in Settings → Patterns with "Imported from ChatGPT" badge

### Memory System

Imported memories create synthetic sessions:
- Session ID prefixed with `imported-`
- Transcript notes the source
- Memory node has full content and embedding
- Appears in semantic search results

---

## Error Handling

### File Parsing Errors

```typescript
try {
  const content = await FileSystem.readAsStringAsync(fileUri);
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error('Invalid file format: expected array of conversations');
  }

  if (data.length > 0 && !data[0].mapping) {
    throw new Error('Invalid ChatGPT export format');
  }
} catch (error) {
  if (error instanceof SyntaxError) {
    return { error: 'File is not valid JSON. Make sure you selected conversations.json from your ChatGPT export.' };
  }
  throw error;
}
```

### API Errors

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error.message.includes('rate limit')) {
        await sleep(RETRY_DELAY * (i + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
```

### Partial Completion

If processing is interrupted:
- `import_sessions` table tracks `last_processed_index`
- User can resume from Settings (show "Resume Import" if pending)
- Review progress is saved incrementally

---

## Privacy Considerations

### Data Handling

1. **File stays on device**: The JSON file is read locally, not uploaded
2. **Only text sent to AI**: Conversation text sent to LLM for analysis (same as regular sessions)
3. **User controls what's saved**: Review screen lets user reject any extracted item
4. **Clear source tracking**: All imported data is tagged as `source: 'chatgpt_import'`

### User Communication

Add to import instructions screen:
```
Your data stays on your device. Only conversation text is sent to the AI
for analysis (same as when you journal). You'll review everything before
it's saved.
```

---

## Success Criteria

### Functional Requirements

- [ ] User can select and upload conversations.json
- [ ] Processing shows clear progress with time estimate
- [ ] Irrelevant conversations (code, homework) are filtered out
- [ ] Personal facts are extracted with appropriate categories
- [ ] Patterns are detected when themes appear across conversations
- [ ] Relevant conversations become searchable memory nodes
- [ ] User can review each item individually (accept/reject)
- [ ] "Accept All" option available for trusting users
- [ ] Completion screen shows clear summary
- [ ] Import can be cancelled mid-process
- [ ] Data is properly tagged as imported

### Quality Requirements

- [ ] Classification accuracy: >80% agreement with human judgment
- [ ] Extraction quality: Facts are specific and accurate to source
- [ ] Pattern quality: Only patterns with 2+ conversation support
- [ ] Performance: <5 minutes for 500 conversations
- [ ] Error handling: Clear messages for invalid files

### Integration Requirements

- [ ] Imported facts appear in Personal Knowledge
- [ ] Imported patterns appear in Settings → Patterns
- [ ] Imported memories appear in semantic search
- [ ] Alma references imported knowledge naturally in conversations

---

## Testing Approach

### Unit Tests

1. **Linearization**
   - Test various tree structures (linear, branched, deeply nested)
   - Test handling of null messages, system messages
   - Test empty conversations

2. **Classification**
   - Test with mock conversations of each category
   - Verify scoring thresholds

3. **Deduplication**
   - Test similar facts are merged
   - Test distinct facts are preserved

### Integration Tests

1. **Full pipeline**
   - Process a sample export file
   - Verify all phases complete
   - Verify data is saved correctly

2. **Review flow**
   - Accept/reject items
   - Verify database updates

### Manual Testing

1. **Real ChatGPT exports**
   - Test with actual user exports (with permission)
   - Verify classification accuracy
   - Verify extraction quality

2. **Edge cases**
   - Empty export
   - Very large export (1000+ conversations)
   - Export with only code/homework conversations
   - Export with only personal conversations

---

## Future Enhancements

### Phase 2: Other Sources

The import system is designed to be extensible:
- Apple Notes export
- Google Keep export
- Day One journal export
- Plain text journal files

### Phase 3: Continuous Sync

- Periodic re-import option
- Delta detection (only process new conversations)
- Background processing

### Phase 4: Smart Deduplication

- Use embeddings for semantic deduplication
- Detect when imported facts conflict with existing knowledge
- Present conflicts to user for resolution
