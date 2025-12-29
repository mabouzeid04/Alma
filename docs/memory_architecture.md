The Memory Problem
Each conversation generates unstructured data (transcript). The AI needs to retrieve relevant past context during future conversations. This is a retrieval problem.
Four-Layer Memory System
Layer 1: Raw Transcripts

Full conversation transcripts stored as-is
Never modified or deleted
Timestamped and linked to session metadata
This is the source of truth

Layer 2: Personal Knowledge Base
Persistent facts about me that rarely change:

Biographical: college, major, hometown, job
Preferences: favorite ice cream, music taste, coffee order
Relationships: girlfriend's name, best friend's names, family members
Goals: long-term aspirations, things I'm working toward
Habits: gym routine, sleep schedule, how I spend weekends

Key properties:

This is NOT a fixed schema. The AI maintains and updates it.
After each session, AI reviews: "Did I learn any new persistent facts? Did any existing facts change?"
Format: Simple key-value or structured document that's easy to update
Examples:

"Girlfriend: Sarah (as of March 2024)"
"College: UCSD, Major: Computer Science and Business Economics"
"Favorite ice cream: Mint chocolate chip"


Update mechanism:

If I mention breaking up: AI updates "Girlfriend: Sarah (March 2024 - December 2024)"
If I mention changing majors: AI updates the major field
If I mention a new hobby: AI adds it to interests

This layer gets loaded into EVERY conversation context. It's the baseline "who is Mahmoud" knowledge.
Layer 3: Session Memory Nodes
After each session, generate a structured summary:

Key topics discussed
Reflections and thoughts (not just decisions)
Emotional states (anxious, excited, reflective, content, frustrated, etc.)
Important events from the day
People mentioned and relationship dynamics
Decisions made (when applicable)
Questions or concerns I'm thinking through

Format: JSON or structured text that's easy to embed and query.
Example for a reflective session:
{
  "session_id": "uuid",
  "timestamp": "ISO datetime",
  "summary": "Reflected on feeling disconnected from friends lately. Talked about the presentation that went well at work but still feeling impostor syndrome.",
  "topics": ["loneliness", "work presentation", "impostor syndrome"],
  "emotions": ["reflective", "lonely", "proud but anxious"],
  "events": ["gave presentation to senior leadership"],
  "people_mentioned": ["Sarah", "Tom from work"],
  "thoughts": ["Maybe I need to be more proactive about reaching out", "The presentation went well but I still doubt myself"],
  "unresolved_questions": ["Why do I feel distant from my friends?"]
}
These nodes are what actually get searched during conversations.
Layer 4: Vector Embeddings

Each memory node gets embedded (convert to vector)
Enables semantic search across all past sessions
When user talks about a topic, find similar past topics via cosine similarity
When user expresses an emotion, find past similar emotional states

Retrieval Strategy
During a conversation:

Personal Knowledge Base is ALWAYS in context (small, static facts)
As I talk, AI identifies key topics/emotions in real-time
Query vector database for top 3-5 most relevant past memory nodes
Include these in AI context for generating follow-up questions
AI references them naturally ("Last time you felt lonely you mentioned...")

The AI should NOT dump all past context. It should surface specific relevant moments.
Personal Knowledge Base Maintenance
After EVERY session:

AI reviews conversation for persistent facts
Checks: "Did I learn something new about Mahmoud that should be permanent?"
Checks: "Did any existing facts change?"
Updates the knowledge base accordingly

Examples:

Session 1: "I'm studying CS at UCSD" → Adds to knowledge base
Session 47: "Sarah and I broke up last week" → Updates relationship status
Session 102: "I switched my major to just CS" → Updates major

This happens automatically. I don't manually maintain it.
Indexing Strategy
Three retrieval paths:
Personal Knowledge (always loaded):

Loaded into every conversation
Small enough to fit in context window
AI uses this as baseline facts

Semantic (primary for memory):

Embed the summary + topics + thoughts
Vector search finds conceptually similar past sessions
Works for: "I'm feeling lonely" → finds past loneliness reflections

Structured (secondary):

Direct queries on tags/metadata
Works for: "When did I last talk about work?" → filter by topics
Works for: "How was I feeling last Tuesday?" → filter by timestamp

What Gets Remembered vs. Forgotten
Personal Knowledge Base (persistent):

Biographical facts
Relationships and their status
Preferences and habits
Long-term goals

Session Memory Nodes (all sessions):

Daily reflections and thoughts
Emotional states and patterns
Events and experiences
Relationship dynamics and interactions
Decisions when made
Recurring themes and concerns

Can be less detailed in synthesis:

Small talk at start of sessions
Very mundane updates with no emotional or reflective weight

The synthesis step should capture the substance of what I talked about, whether that's a decision, a feeling, or just processing my day.