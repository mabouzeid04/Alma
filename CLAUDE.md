# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecondBrain is a voice-first journaling app built with React Native (Expo) that uses AI conversation and a 4-layer memory system. The core idea: voice journal entries become structured knowledge that AI can query across sessions.

## Common Commands

```bash
# Start development server (from app/ directory)
cd app && npm start

# Run on iOS simulator (press 'i' after start)
# Run on Android emulator (press 'a' after start)

# Clear Expo cache if issues occur
cd app && npx expo start -c

# Install dependencies (use legacy-peer-deps if needed)
cd app && npm install --legacy-peer-deps

# Type check
cd app && npx tsc
```

## Environment Setup

Copy `app/.env.example` to `app/.env` and add API keys:
- `EXPO_PUBLIC_GEMINI_API_KEY` - For STT, TTS, AI conversation, and embeddings
- `EXPO_PUBLIC_GEMINI_TTS_VOICE` - Optional TTS voice name (default: Kore)

## Architecture

### Directory Structure
```
app/
├── app/                    # Screens (Expo Router with typed routes)
│   ├── index.tsx          # Home with record button
│   ├── conversation.tsx   # Active voice conversation
│   ├── history.tsx        # Past sessions list
│   └── session/[id].tsx   # Session detail view
└── src/
    ├── components/        # UI components (RecordButton, MessageBubble, etc.)
    ├── hooks/             # useSessions, useSession
    ├── services/          # Core business logic
    │   ├── ai.ts         # Voice AI, memory synthesis, embeddings
    │   ├── audio.ts      # Recording via expo-av
    │   └── database.ts   # SQLite operations
    ├── theme/             # Design system (colors, typography, spacing)
    └── types/             # TypeScript interfaces
```

### Four-Layer Memory System

The AI service (`app/src/services/ai.ts`) implements:

1. **Raw Transcripts** - Full conversation history in SQLite (source of truth)
2. **Personal Knowledge Base** - Persistent facts about the user (biographical, relationships, preferences, goals, habits). Auto-extracted after each session, always loaded into AI context.
3. **Session Memory Nodes** - Structured summaries per session (topics, emotions, events, people, thoughts, unresolved questions)
4. **Vector Embeddings** - Gemini text-embedding-004 for semantic search across past sessions

### Key Flows

**Conversation Flow:**
1. User taps record → audio captured via expo-av
2. Audio transcribed via Gemini multimodal (gemini-2.5-flash)
3. Response generated via Gemini with personal facts + relevant memories in context
4. Response spoken via Gemini TTS (gemini-2.5-flash-preview-tts)

**Session End Flow:**
1. Memory synthesized (Gemini extracts structured insights)
2. Personal facts extracted/updated
3. Vector embedding generated for semantic search
4. Everything persisted to SQLite

### External APIs

- **Gemini** (`generativelanguage.googleapis.com/v1beta`): STT (gemini-2.5-flash), TTS (gemini-2.5-flash-preview-tts), Conversation (gemini-3-flash-preview), Embeddings (text-embedding-004)

### Database Schema

SQLite via expo-sqlite with tables:
- `sessions` - Journal sessions with metadata
- `messages` - Conversation messages linked to sessions
- `memory_nodes` - Structured session summaries with embeddings
- `personal_facts` - Persistent user facts with active/inactive status

### Path Alias

TypeScript configured with `@/*` mapping to `src/*` (e.g., `import { colors } from '@/theme'`).

## Design Philosophy

From `docs/conversation_design.md`: The AI should sound like a thoughtful friend, not a therapist. Key principles:
- Listen more than interrogate
- One question at a time
- Reference memory naturally ("Didn't this happen before?") not like a database query
- Match user energy - casual or reflective
- Probe emotions and recurring themes; skip small logistics
