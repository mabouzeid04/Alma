## System Overview – Changes vs origin/main

Date: 2026-01-02

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

## Project: Second Brain
Second Brain is a voice-first journaling application built with React Native (Expo), featuring AI-driven conversations and a sophisticated memory system.

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

