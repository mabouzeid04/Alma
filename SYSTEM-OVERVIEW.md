# SecondBrain - System Overview

## What is SecondBrain?

SecondBrain is a voice-first journaling application built with React Native (Expo) that transforms spoken thoughts into structured, queryable knowledge through AI conversation. The core concept: voice journal entries become a persistent memory system that AI can reference across sessions, creating increasingly meaningful conversations over time.

### Vision & Purpose

The app solves a fundamental problem: AI agents need persistent, queryable knowledge about users to be genuinely useful. SecondBrain generates that knowledge through natural voice journaling, building a comprehensive database of thoughts, feelings, decisions, and experiences that grows with each conversation.

**Success Criteria:**
- Consistent usage (3+ times per week)
- AI naturally surfaces relevant past context during conversations
- Journal captures enough detail to be genuinely useful for future Alma interactions
- Data is structured and portable

**Non-Goals:**
- Mood tracker with charts
- Productivity system
- Therapy replacement
- Social platform

## Core Features

### 1. Voice-First Journaling
- **Natural Conversation**: Talk through thoughts and feelings as if speaking to a thoughtful friend
- **Real-Time Recording**: Audio capture with visual waveform feedback during recording
- **Automatic Transcription**: ElevenLabs Scribe API converts speech to text
- **AI-Powered Responses**: Gemini generates contextually aware responses with text-to-speech playback
- **Session Management**: All conversations saved with full history and playback capabilities

### 2. Four-Layer Memory System
The app implements a sophisticated memory architecture that enables AI to understand and reference past context:

**Layer 1: Raw Transcripts**
- Full conversation history stored in SQLite
- Never modified or deleted (source of truth)
- Timestamped and linked to session metadata

**Layer 2: Personal Knowledge Base**
- Persistent facts about the user (biographical info, relationships, preferences, goals, habits)
- Auto-extracted and updated after each session
- Always loaded into AI context as baseline knowledge
- Self-maintaining: AI reviews conversations for new/changed facts

**Layer 3: Session Memory Nodes**
- Structured summaries generated after each session containing:
  - Key topics discussed
  - Reflections and thoughts
  - Emotional states
  - Important events
  - People mentioned and relationship dynamics
  - Decisions made
  - Unresolved questions
- Stored as searchable JSON structures

**Layer 4: Vector Embeddings**
- Semantic search across all past sessions using Gemini text-embedding-004
- Enables finding conceptually similar past conversations
- Recency-weighted retrieval (60-day half-life, 0.7 similarity / 0.3 recency blend)
- Granular memory vectors (chunks/highlights) with 500-character context snippets

### 3. AI-Powered Insights
- **Pattern Analysis**: Generates narrative insights from journal sessions (minimum 3 sessions required)
- **Time Periods**: Weekly, monthly, and all-time views
- **Insight Types**:
  - Trends: Changes over time
  - Patterns: Recurring themes or behaviors
  - Growth: Positive progress or resolved issues
  - Suggestions: Gentle observations
  - Reflections: Topics worth thinking about
- **Emotional Summaries**: Visualizes emotional trends and topic frequencies
- **Smart Caching**: 24h cache for weekly, 72h for monthly, 168h for all-time insights

### 4. Session History & Playback
- Browse all past journal sessions
- View session summaries with structured insights
- Replay conversations with full message history
- Direct navigation to specific sessions

### 5. AI-Powered Insights
- **Pattern Analysis**: Generates narrative insights from journal sessions (minimum 3 sessions required)
- **Time Periods**: Weekly, monthly, and all-time views
- **Insight Types**:
  - Trends: Changes over time
  - Patterns: Recurring themes or behaviors
  - Growth: Positive progress or resolved issues
  - Suggestions: Gentle observations
  - Reflections: Topics worth thinking about
- **Emotional Summaries**: Visualizes emotional trends and topic frequencies
- **Smart Caching**: 24h cache for weekly, 72h for monthly, 168h for all-time insights

### 6. Settings Hub & Data Management
- **Multi-Page Settings**: Comprehensive settings interface with dedicated pages for different concerns
- **Pattern Management**: View and delete AI-detected recurring themes and behaviors
- **Theory Management**: Manage deeper AI hypotheses about beliefs, values, and relationships
- **Personal Knowledge**: Editable facts the AI remembers about the user
- **Data Hygiene Tools**: Correct AI misinterpretations to maintain conversation accuracy
- **Theory Lifecycle**: Confidence-building system for AI hypotheses with contradiction handling

## Architecture

### Technology Stack

**Frontend:**
- React Native with Expo
- TypeScript for type safety
- Expo Router for navigation (file-based routing)
- Reanimated for smooth animations
- expo-av and expo-audio for audio recording/playback

**Backend Services:**
- SQLite (expo-sqlite) for local data persistence
- ElevenLabs API for speech-to-text (Scribe) and text-to-speech (eleven_turbo_v2_5)
- Gemini API for AI conversation (gemini-3-flash-preview) and embeddings (text-embedding-004)
- xAI (Grok) as alternative conversation model provider

**Testing:**
- Detox for E2E testing
- Jest for unit testing
- TypeScript with ts-jest

### Directory Structure

```
app/
├── app/                    # Screens (Expo Router with typed routes)
│   ├── index.tsx          # Home screen with record button
│   ├── conversation.tsx   # Active voice conversation UI
│   ├── history.tsx        # Past sessions list
│   ├── session/[id].tsx   # Session detail view
│   ├── summary.tsx        # Session summary display
│   ├── insights.tsx       # AI-powered insights modal
│   ├── prompts.tsx        # AI-generated journaling prompts
│   ├── settings/          # Multi-page settings hub
│   │   ├── _layout.tsx    # Settings navigation structure
│   │   ├── index.tsx      # Settings hub with menu items
│   │   ├── personal-knowledge.tsx  # Editable personal facts
│   │   ├── patterns.tsx   # Pattern viewing and deletion
│   │   ├── theories.tsx   # Theory management (placeholder)
│   │   └── preferences.tsx # App preferences (placeholder)
│   ├── processing.tsx     # Loading state during AI processing
│   └── _layout.tsx        # Navigation structure and modals
├── src/
│   ├── components/        # UI components
│   │   ├── ConversationStatus.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── PatternCard.tsx        # Pattern display card
│   │   ├── PromptCard.tsx         # Prompt display card
│   │   ├── PulsingOrb.tsx
│   │   ├── RecordButton.tsx
│   │   ├── SessionCard.tsx
│   │   ├── SettingsMenuItem.tsx   # Settings menu item
│   │   ├── TheoryCard.tsx         # Theory display card
│   │   └── WaveformVisualizer.tsx
│   ├── hooks/             # React hooks
│   │   ├── useInsights.ts
│   │   ├── usePatterns.ts         # Pattern management
│   │   ├── usePrompts.ts
│   │   ├── useSession.ts
│   │   ├── useSessions.ts
│   │   ├── useTheories.ts         # Theory management
│   │   └── useTypography.ts       # Typography utilities
│   ├── services/          # Core business logic
│   │   ├── ai.ts          # Voice AI, memory synthesis, embeddings
│   │   ├── audio.ts       # Recording and playback via expo-av
│   │   ├── database.ts    # SQLite operations and schema
│   │   ├── insights.ts    # Insights generation and caching
│   │   ├── patterns.ts    # Pattern detection and management
│   │   ├── personalization.ts    # User preferences and settings
│   │   ├── prompts.ts     # AI-generated prompts
│   │   └── theories.ts    # Working theories system
│   ├── theme/             # Design system (colors, typography, spacing)
│   └── types/             # TypeScript interfaces
├── e2e/                   # End-to-end tests (Detox)
└── scripts/               # Setup and maintenance scripts
```

### Database Schema

SQLite database with the following tables:

- **sessions**: Journal sessions with metadata (id, timestamp, title, duration)
- **messages**: Conversation messages linked to sessions (id, sessionId, role, content, timestamp)
- **memory_nodes**: Structured session summaries with embeddings (id, sessionId, summary, topics, emotions, events, people, thoughts, questions, embedding)
- **memory_vectors**: Granular text chunks with embeddings for semantic search
- **personal_facts**: Persistent user facts with active/inactive status (id, category, key, value, active, createdAt, updatedAt)
- **insights_reports**: Cached insight reports by time period (id, period, generatedAt, emotionalSummary, topics, expiresAt)
- **insights**: Individual insight entries (id, reportId, type, content, expiresAt)
- **patterns**: AI-detected recurring themes (id, subject, description, patternType, confidence, evidenceQuotes, relatedSessions, firstObserved, deletedAt)
- **theories**: AI hypotheses about beliefs/values/behaviors (id, title, theory, category, confidence, status, evidence, evidenceSessions, lastEvaluated, firstFormed, relatedPatterns)
- **prompts**: AI-generated journaling prompts (id, question, relatedSessions, status, createdAt, expiresAt)

All tables auto-created on app initialization. No manual migrations needed.

## Key User Flows

### Starting a Journal Session
1. User opens app and taps the record button on home screen
2. App navigates to conversation screen
3. AI greets user with time-appropriate opener
4. User begins speaking (waveform visualizes audio levels)
5. Speech transcribed in real-time via ElevenLabs
6. AI generates response using:
   - Personal knowledge base (always loaded)
   - Top 3-5 most relevant past memory nodes (semantic search)
   - Relevant memory vector snippets
7. Response spoken via text-to-speech
8. Conversation continues until user ends session

### Ending a Session & Memory Synthesis
1. User ends conversation
2. App navigates to processing screen
3. Background tasks execute:
   - Memory synthesis: AI extracts structured insights (topics, emotions, events, people, thoughts, questions)
   - Personal facts extraction/update: AI reviews conversation for new/changed persistent facts
   - Vector embedding generation: Create embeddings for session summary and text chunks
   - Database persistence: Save all data to SQLite
4. User navigates to summary screen showing session insights
5. Session appears in history list

### Viewing Insights
1. User taps sparkles icon on home screen (appears after 3+ sessions)
2. Insights modal slides up from bottom
3. Select time period (Week / Month / All Time)
4. If cached and fresh, insights display immediately
5. Otherwise, AI generates new insights report:
   - Aggregates session data across period
   - Identifies emotional trends, recurring themes, growth areas
   - Generates narrative insights with specific types
6. Display emotional summary, insight cards, and topic analysis
7. User can refresh to regenerate insights

## Screens & Navigation

### Main Screens
- **Home (index.tsx)**: Record button, quick access to history, insights, and prompts
- **Conversation (conversation.tsx)**: Active voice session with waveform visualization
- **Processing (processing.tsx)**: Loading state during memory synthesis
- **Summary (summary.tsx)**: Session summary with structured insights
- **History (history.tsx)**: List of all past journal sessions
- **Session Detail (session/[id].tsx)**: View specific session with full conversation
- **Prompts (prompts.tsx)**: AI-generated journaling prompts based on user patterns

### Modal Screens
- **Insights (insights.tsx)**: AI-powered pattern analysis (slide from bottom)

### Settings Hub (Multi-Page)
- **Settings Index (settings/index.tsx)**: Hub page with menu items for different settings
- **Personal Knowledge (settings/personal-knowledge.tsx)**: Editable facts the AI remembers
- **Patterns (settings/patterns.tsx)**: View and delete AI-detected patterns
- **Theories (settings/theories.tsx)**: View and delete AI hypotheses (placeholder)
- **Preferences (settings/preferences.tsx)**: App settings (placeholder)

## External Services

### ElevenLabs API
- **Speech-to-Text**: Scribe API for real-time transcription
- **Text-to-Speech**: eleven_turbo_v2_5 model for natural AI voice
- **Configuration**: API key and optional custom voice ID via environment variables

### Gemini API
- **Conversation**: gemini-3-flash-preview for AI responses
- **Embeddings**: text-embedding-004 for semantic search (768-dimensional vectors)
- **Insights**: gemini-2.0-flash for pattern analysis
- **Configuration**: API key via environment variables

### xAI (Grok)
- **Alternative Model**: grok-4.1-fast-non-reasoning as configurable conversation provider
- **Configuration**: Can be used instead of Gemini for primary conversation model

## Design Philosophy

### Conversation Tone
The AI is designed to sound like a **thoughtful friend, not a therapist**. Key principles:

- **Listen more than interrogate**: Let user finish thoughts before asking questions
- **One question at a time**: Avoid question barrages
- **Natural memory references**: "Didn't this happen before?" not "According to our conversation on..."
- **Match user energy**: Casual or reflective based on user's tone
- **Probe emotions and recurring themes**: Skip small logistics
- **Conversational language**: "That sounds rough" not "I hear that you're experiencing frustration"

### Visual Design
- **Warm earth tones**: #F5F1E8 background, #A07855 primary accent (Golden Wood/Raw Sienna)
- **Clean typography**: System fonts with consistent hierarchy
- **Smooth animations**: Reanimated for natural transitions
- **Real-time feedback**: Waveform visualization during recording
- **Card-based layouts**: Consistent styling across history and insights screens

## Development & Configuration

### Environment Variables
See `app/.env.example` for complete list. Key variables:
- `EXPO_PUBLIC_ELEVENLABS_API_KEY`: Required for speech services
- `EXPO_PUBLIC_GEMINI_API_KEY`: Required for AI and embeddings
- `EXPO_PUBLIC_ELEVENLABS_VOICE_ID`: Optional custom voice
- Model provider and model selection for conversation, memory, knowledge, and insights

### Common Commands
```bash
# Start development server
cd app && npm start

# Run on iOS simulator (press 'i' after start)
# Run on Android emulator (press 'a' after start)

# Clear cache if issues occur
cd app && npx expo start -c

# Type check
cd app && npx tsc

# E2E tests (iOS)
npm run detox:build:ios
npm run detox:test:ios
```

### Path Alias
TypeScript configured with `@/*` mapping to `src/*` for cleaner imports:
```typescript
import { colors } from '@/theme'
import { useSession } from '@/hooks'
```

---

## Recent Changes & Development History

Last Updated: 2026-01-08

### Recent Changes - January 8, 2026

### Settings Hub Restructure Implementation

**Major UI/UX Overhaul**: Transformed the simple Personal Knowledge settings page into a comprehensive multi-page Settings Hub that provides users with data hygiene tools to manage AI-detected patterns and theories.

**New Settings Hub Architecture**:
- **Settings Hub** (`app/app/settings/index.tsx`): Central navigation page with menu items for different settings categories
- **Personal Knowledge** (`app/app/settings/personal-knowledge.tsx`): Moved from original settings page - editable personal facts the AI remembers
- **Patterns** (`app/app/settings/patterns.tsx`): View and delete AI-detected recurring themes and behaviors
- **Theories** (`app/app/settings/theories.tsx`): View and delete deeper AI hypotheses about beliefs, values, and behaviors
- **Preferences** (`app/app/settings/preferences.tsx`): Placeholder for future app settings (voice, notifications, appearance)

**Navigation Structure** (`app/app/settings/_layout.tsx`):
- Stack navigator for settings sub-pages with consistent header styling
- Back navigation from sub-pages to hub
- Clean separation of concerns between hub and individual pages

**Data Hygiene Features**:
- **Pattern Management**: Users can view all AI-detected patterns in card format with delete functionality
- **Theory Management**: Similar interface for managing working theories (deeper hypotheses)
- **Confirmation Dialogs**: Safe deletion with clear warnings about AI behavior changes
- **Session Linking**: Each pattern/theory shows related session counts and first observation dates

**New Services & Hooks**:

**Personalization Service** (`app/src/services/personalization.ts`):
- Foundation for user preferences and app customization
- Currently stub implementation for future features
- Configurable AI model providers and voice settings

**Theories Service** (`app/src/services/theories.ts`):
- Advanced AI-powered theory formation system
- Higher thresholds than patterns (10+ sessions, 8+ weeks minimum)
- Confidence scoring with decay for contradictions
- Categories: values, behaviors, relationships, beliefs, triggers
- Status progression: developing → confident, with questioning state for contradictions
- Background understanding that informs AI responses without being prominently displayed

**Enhanced Patterns Service** (`app/src/services/patterns.ts`):
- Improved pattern detection with emergent LLM analysis
- Pattern types: emotional, behavioral, relational, thematic, unresolved questions
- Confidence scoring and evidence tracking
- Auto-maintenance with soft deletion capabilities

**React Hooks**:
- **usePatterns** (`app/src/hooks/usePatterns.ts`): State management for pattern viewing and deletion
- **useTheories** (`app/src/hooks/useTheories.ts`): State management for theory management (currently stub)
- **useTypography** (`app/src/hooks/useTypography.ts`): Theme-aware typography utilities

**New UI Components**:
- **SettingsMenuItem** (`app/src/components/SettingsMenuItem.tsx`): Reusable menu item with icon, title, subtitle, and optional badge
- **PatternCard** (`app/src/components/PatternCard.tsx`): Display card for patterns with delete functionality
- **TheoryCard** (`app/src/components/TheoryCard.tsx`): Display card for theories with delete functionality

**Database Schema Extensions**:
- Enhanced pattern/theory tables with confidence scoring and evidence tracking
- Soft deletion support for patterns
- Theory lifecycle management (developing/confident/questioning)
- Auto-creation on app initialization

**Design System Enhancements**:
- Updated iconography for different settings categories
- Consistent card layouts matching history/insights screens
- Warm earth tone aesthetic maintained (#F5F1E8 background, #E88D67 primary)
- Responsive typography and spacing

**Key Implementation Details**:
- **Data Hygiene Philosophy**: Users must be able to correct AI misinterpretations to maintain conversation accuracy
- **Theory vs Pattern Distinction**: Patterns are "what" observations, theories are "why" hypotheses
- **Confidence Building**: Theories start with low confidence (0.3) and build over time with evidence
- **Contradiction Handling**: Theories decay when contradicted, entering questioning state
- **Session-Based Context**: All patterns/theories link to specific journal sessions for transparency

**Environment Variables**:
- `EXPO_PUBLIC_THEORY_MODEL_PROVIDER`: AI provider for theory detection (defaults to xai)
- `EXPO_PUBLIC_THEORY_MODEL`: Model for theory analysis (defaults to grok-4-1-fast-non-reasoning)

**Migration Details**:
- Original `settings.tsx` content moved to `settings/personal-knowledge.tsx`
- New folder-based routing structure with `_layout.tsx` navigator
- All existing functionality preserved with enhanced data management capabilities

---

### Recent Changes - January 5, 2026

### AI-Powered Prompts Feature Implementation

**New Prompts System**: Added comprehensive AI-generated journaling prompts based on user patterns and session analysis.

**Architecture**:
- **Prompts Service** (`app/src/services/prompts.ts`): Core generation logic using pattern analysis
  - `generatePrompts(count)` - Generates personalized prompts based on user patterns
  - `getActivePrompts()` - Retrieves undismissed prompts with expiration management
  - `dismissPrompt(id)` - Marks prompts as dismissed (soft delete)
  - Uses `grok-4-1-fast-non-reasoning` model via xAI for prompt generation
  - Minimum 3 sessions required before prompts become available
  - Prompts expire after 14 days to keep them fresh and relevant

- **Patterns Service** (`app/src/services/patterns.ts`): Foundation for prompt generation
  - `getConfirmedPatterns()` - Extracts meaningful patterns from user sessions
  - `getActivePatterns()` - Tracks currently active patterns with confidence scoring
  - Pattern types: emotional, behavioral, relational, thematic, unresolved questions
  - Uses emergent LLM analysis rather than deterministic rules

- **React Hook** (`app/src/hooks/usePrompts.ts`): State management for prompts UI
  - States: `loading | ready | generating | insufficient_data`
  - Handles prompt generation, dismissal, and session count tracking
  - Auto-loads prompts on component mount

- **Prompts Screen** (`app/app/prompts.tsx`): Full-featured prompts interface
  - Card-based layout with animated entry/exit transitions
  - Pull-to-refresh functionality
  - Loading states with skeleton cards and progress indicators
  - Empty states with helpful guidance for users with insufficient sessions
  - "Generate more" functionality to create additional prompts
  - Session-based context showing which sessions informed each prompt

- **Prompt Card Component** (`app/src/components/PromptCard.tsx`):
  - Interactive cards showing generated questions
  - "Talk about this" button navigates to conversation with prompt context
  - "Not now" dismissal option
  - Session reference linking to source conversations

**Navigation Integration** (`app/app/index.tsx`):
- Added prompts button to home screen when 3+ sessions exist
- Consistent with insights sparkles icon pattern
- Navigation to `/prompts` route

**Database Schema** (`app/src/services/database.ts`):
- New `prompts` table: id, question, related_sessions, status, created_at, expires_at
- Session foreign key linking to source conversations
- Indexes for efficient querying and expiration management
- Auto-created on app initialization

**Key Implementation Details**:
- Prompts are generated by asking AI: "What questions would you want to explore based on these patterns?"
- Each prompt references specific sessions that informed its creation
- Prompts are personalized - AI generates questions that are specific to the user's unique patterns
- Conversational tone: Prompts frame questions as "I noticed..." rather than clinical observations
- Pattern analysis focuses on emotional trends, recurring themes, relationships, and unresolved questions

**Environment Variables**:
- `EXPO_PUBLIC_PROMPT_MODEL_PROVIDER`: Optional, defaults to `xai`
- `EXPO_PUBLIC_PROMPT_MODEL`: Optional, defaults to `grok-4-1-fast-non-reasoning`
- `EXPO_PUBLIC_XAI_API_KEY`: Required for xAI prompt generation

**Design System**:
- Matches existing warm earth tone aesthetic (#F5F1E8 background, #E88D67 primary)
- Card-based layouts consistent with history and insights screens
- Smooth animations using Reanimated for professional feel
- Responsive typography and spacing using established theme system

---

### Recent Changes - January 4, 2026

### E2E Testing Infrastructure
- **Detox Framework Integration**: Added comprehensive end-to-end testing framework with Jest configuration
  - New Detox configuration (`app/.detoxrc.js`) for iOS simulator testing
  - E2E test directory (`app/e2e/`) with test plan, initial tests, and setup files
  - Package scripts added: `detox:build:ios`, `detox:test:ios`, `detox:test:ios:reuse`
- **Database E2E Support**: Enhanced `app/src/services/database.ts` with seeding functionality
  - `clearAllSessions()` function for test data cleanup
  - `setE2ESeedScenario()` for configurable test data scenarios
  - Automatic E2E seed application during test runs
- **Test Dependencies**: Added Detox, Jest, and TypeScript testing dependencies to `app/package.json`

### Insights UI Improvements
- **Enhanced Insufficient Data Messaging**: Improved user guidance in `app/app/insights.tsx`
  - Dynamic session count display with remaining sessions needed
  - Better copy: "What I noticed" → "What we noticed" for more collaborative tone
  - Clear progress indication toward insights unlock threshold

### Development Tools & Configuration
- **Cursor Command Added**: New security review command (`.cursor/commands/secreview.md`) for automated PR security analysis
- **Build Script Cleanup**: Removed `app/start.sh` file (redundant with existing scripts)

### Dependencies Updated
- **Testing Framework**: Jest 30.2.0, Detox 20.46.3, ts-jest 29.4.6
- **Type Definitions**: Added @types/jest for comprehensive type coverage
- **Development Tools**: Enhanced testing and build capabilities

---

### Recent Changes - January 3, 2026

### Summary Screen Enhancements
- **Session-Specific Navigation**: Updated `app/app/summary.tsx` to accept `sessionId` route parameter, enabling direct navigation to specific session summaries
- **Loading States**: Added proper loading indicators with `ActivityIndicator` and state management for better UX during session loading
- **Error Handling**: Improved error recovery with navigation fallback to home screen when sessions are not found
- **Route Parameter Support**: Integrated `useLocalSearchParams` for dynamic session selection

### Audio Service Improvements
- **Enhanced Waveform Metering**: Improved audio level detection in `app/src/services/audio.ts` with fallback simulation for consistent waveform visualization
- **Organic Oscillation**: Added simulated audio levels with natural variation when real metering data is unavailable
- **Recording Stability**: Better handling of audio metering during recording sessions

### Conversation Screen Updates
- **Waveform Integration**: Enhanced touch handling and visual feedback in `app/app/conversation.tsx`
- **UI Container**: Added dedicated waveform container with slide-in animation
- **Interaction Improvements**: Better press handling for recording start/stop functionality

### Minor Service Updates
- **Processing Screen**: Refined loading states and user feedback in `app/app/processing.tsx`
- **Session Hook**: Minor optimizations in `app/src/hooks/useSession.ts`
- **Database Service**: Small improvements in `app/src/services/database.ts`

---

### Memory & Retrieval
- Added recency-weighted retrieval (60-day half-life, 0.7 similarity / 0.3 recency blend).
- Introduced chunk/highlight memory vectors with caps to reduce bloat; generate on session end and use in response context.
- Expanded DB schema with `memory_vectors` table (auto-created on app start); added CRUD helpers.
- `useSession` now preloads and retrieves vectors per turn and injects snippets into the system prompt.
- System prompt now includes both session summaries and granular snippets.

### App code changes
- `app/src/services/ai.ts`: chunking/highlight extraction, vector generation, recency blending for memories/vectors.
- `app/src/services/database.ts`: new table + vector persistence.
- `app/src/hooks/useSession.ts`: loads/saves vectors, retrieves relevant snippets for replies.
- `app/src/types/index.ts`: added `MemoryVector` types.

### Config/tooling
- `app/package.json`: removed `build` script; kept `web`.
- `app/metro.config.js`: removed wasm asset extension override.
- `RUN_THIS.sh`: added explicit tunnel start note.
- `app/.env`: updated values (not listed here).

### Docs/content
- Deleted: `QUICKSTART.md`, `SETUP_VOICE_AI.md`, `TROUBLESHOOT.md`.
- New/updated docs: `SYSTEM-OVERVIEW.md` (this file); `CLAUDE.md` added to repo.

### Notes
- New table creation runs automatically via existing init flow; no manual migration needed.
- Retrieval falls back to recency-only if embeddings are missing/unavailable.

---

## Recent Changes - January 2, 2026

### AI Service Optimization
- **Memory Vector Display**: Increased character limit for memory vector text snippets from 220 to 500 characters in `app/src/services/ai.ts` to provide more context in AI responses.

### Model Provider Update
- **Primary Models**: Switched all model providers from "grok" to "xai" in `app/.env`:
  - Primary model provider: `grok` → `xai`
  - Memory model provider: `grok` → `xai`
  - Knowledge model provider: `grok` → `xai`
  - All using `grok-4.1-fast-non-reasoning` model
- **Embedding Model**: Kept Gemini as embedding provider for consistency.

### AI-Powered Insights Feature
Implemented comprehensive pattern analysis system that generates narrative insights from journal sessions.

**Architecture**:
- **Insights Service** (`app/src/services/insights.ts`): Core generation logic with caching
  - `getInsights(period, forceRefresh)` - Main entry point with smart cache management
  - `generateInsightsReport()` - Orchestrates AI analysis and response parsing
  - `callInsightsAI()` - Gemini API integration with structured JSON responses
  - Uses `gemini-2.0-flash` model (configurable via `EXPO_PUBLIC_INSIGHTS_MODEL`)
  - Minimum 3 sessions required to generate insights
  - Cache freshness: 24h for week, 72h for month, 168h for all_time periods

- **React Hook** (`app/src/hooks/useInsights.ts`): State management for insights loading
  - States: `idle | loading | generating | ready | error | insufficient_data`
  - Handles period selection, manual refresh, and auto-loading on mount
  - Session count tracking for UI feedback

- **Insights Screen** (`app/app/insights.tsx`): Full-featured insights UI
  - Period selector (Week / Month / All Time) with smooth animations
  - Emotional summary card with trend visualization and emotion bars
  - Insight cards with type-specific icons (trend/pattern/growth/suggestion/reflection)
  - Topics section showing recurring/emerging/resolved topics
  - Loading and empty states with helpful messaging
  - Reanimated animations for smooth transitions

- **Navigation Integration** (`app/app/_layout.tsx`, `app/app/index.tsx`):
  - Insights screen added as modal with slide-from-bottom animation
  - Home screen shows sparkles icon when 3+ sessions exist
  - Tapping icon navigates to insights modal

**Key Implementation Details**:
- AI prompt strategy emphasizes "thoughtful friend" observations, not clinical reports
  - Provides examples of good vs. bad insight phrasing
  - Focuses on emotional trends, recurring themes, growth areas, relationships, unresolved questions
  - Aggregates session data: topic frequencies, emotion frequencies, people mentioned, events, thoughts

- Insight types with specific semantics:
  - `trend`: Something increasing/decreasing over time
  - `pattern`: Recurring themes or behaviors
  - `growth`: Positive progress or resolved issues
  - `suggestion`: Gentle observations that might help
  - `reflection`: Something worth thinking about

- Cache management prevents unnecessary API calls and speeds up repeat views
- Database stores reports and individual insights with expiration dates

**Environment Variables**:
- `EXPO_PUBLIC_GEMINI_API_KEY`: Required for insights generation
- `EXPO_PUBLIC_INSIGHTS_MODEL`: Optional, defaults to `gemini-2.0-flash`

**Database Schema** (`app/src/services/database.ts`):
- `insights_reports`: Caches full reports with generatedAt and period
- `insights`: Individual insight entries with expiration tracking
- Auto-created on app initialization

**Design System**:
- Uses existing theme colors, spacing, typography, and shadows
- Matches history screen card styles and warm earth tone aesthetic (#F5F1E8 background, #E88D67 primary)
- Type-specific icon colors for visual distinction

# System Overview & Recent Changes

## Project: Alma
Alma is a voice-first journaling application built with React Native (Expo), featuring AI-driven conversations and a sophisticated memory system.

## Recent Updates (January 1, 2026)

### Frontend & Build System
- **Build Script Added**: Added a `build` script to `app/package.json` (`expo export -p web`) to ensure compatibility with Vercel and other web hosting platforms.
- **Metro Configuration**: Updated `app/metro.config.js` to support `.wasm` files, resolving build errors related to `expo-sqlite` on web.
- **UI Enhancements**:
    - Refined `WaveformVisualizer` for better real-time audio feedback.
    - Updated `conversation.tsx`, `index.tsx`, and `processing.tsx` for improved user experience during recording and AI processing.
    - Updated app icons and splash screen assets.

### Services & Logic
- **AI Service (`ai.ts`)**: Enhanced the voice AI conversation flow, memory synthesis, and embedding generation using Gemini and ElevenLabs.
- **Audio Service (`audio.ts`)**: Optimized audio recording and playback logic using `expo-av` and `expo-audio`.
- **Database Service**: Improved SQLite integration for session management and personal fact extraction.
- **Hooks**: Updated `useSession` and `useSessions` for more robust state management.

### Configuration
- **Environment**: Updated `.env` management for API keys (ElevenLabs, Gemini).
- **Expo Config**: Updated `app.json` with new plugins and permissions for microphone access.

## Recent Changes - January 2, 2026 (Latest Session)

### UI Enhancements & Screen Updates
- **Conversation Screen** (`app/app/conversation.tsx`): 
  - Improved message display and conversation flow handling
  - Enhanced visual feedback during AI processing
  - Better error handling and recovery
  
- **Processing Screen** (`app/app/processing.tsx`):
  - Refined loading states and visual indicators
  - Improved user feedback during processing phase
  
- **Index/Home Screen** (`app/app/index.tsx`):
  - Integration with insights system
  - Sparkles icon display when 3+ sessions exist
  - Navigation to insights modal

### Settings Screen Implementation
- **New Settings Module** (`app/app/settings.tsx`):
  - Comprehensive settings interface (318 lines)
  - User preference management
  - Configuration options for AI and app behavior
  - Theme and display settings

### Layout & Navigation Updates
- **App Layout** (`app/app/_layout.tsx`):
  - Insights modal added as slide-from-bottom animation
  - Updated navigation structure
  - Improved screen transitions

### Environment & Build Configuration
- **Environment File** (`app/.env`):
  - Updated API key configurations
  - Model provider settings (xAI integration)
  - Embedding and insights model configuration
  - 38 configuration variables total

- **Environment Example** (`app/.env.example`):
  - Updated to reflect current configuration
  - Added documentation for all env variables

- **Git Ignore Updates** (`app/.gitignore`):
  - Added sensitive files exclusion
  - Updated to protect `.env` file
  - Added generated artifacts exclusion

- **Setup Scripts Added**:
  - `app/scripts/first-time-setup.sh`: Automated initial setup for development
  - `app/scripts/weekly-rebuild.sh`: Scheduled rebuild maintenance

### Documentation
- **iOS Setup Guide** (`app/iOS_SETUP.md`):
  - Complete iOS development setup instructions
  - Device configuration for testing
  - Building and deployment steps
  - Troubleshooting guide (95 lines)

### Hook Updates
- **Hook Exports** (`app/src/hooks/index.ts`):
  - New insights hook integration
  - Improved export organization

- **useSession Hook** (`app/src/hooks/useSession.ts`):
  - Enhanced vector retrieval and caching
  - Better memory injection into prompts
  - Improved session context management

### Service & Type Improvements
- **AI Service** (`app/src/services/ai.ts`):
  - Memory vector text character limit: 220 → 500 characters
  - Enhanced context injection for better responses
  - Improved chunking and highlight extraction

- **Database Service** (`app/src/services/database.ts`):
  - Insights tables implementation
  - Report and insight entry storage
  - Cache expiration management

- **Types** (`app/src/types/index.ts`):
  - New type definitions for insights
  - Extended memory vector types
  - Updated API response types

- **Package Configuration** (`app/package.json`):
  - Build script removed (build handled by Expo)
  - Web deployment scripts updated
  - Dependencies optimized

## Deployment
The project is now configured for web deployment via Vercel. Running `npm run build` in the `app/` directory generates a production-ready web build in `app/dist/`.

