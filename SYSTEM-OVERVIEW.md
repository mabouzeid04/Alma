## System Overview – Changes vs origin/main

Date: 2026-01-01

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

## Deployment
The project is now configured for web deployment via Vercel. Running `npm run build` in the `app/` directory generates a production-ready web build in `app/dist/`.

