# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alma (internally still called "SecondBrain" in some places) is a voice-first journaling app built with React Native (Expo). The user holds a conversation; the app transcribes, responds with voice, and turns transcripts into a multi-layer memory that AI can query in future sessions. The app also derives **patterns**, **working theories**, **AI-generated prompts**, and **weekly/monthly insights** from accumulated sessions.

The entire app lives in `app/`. Everything below assumes `cd app` first.

## Common Commands

```bash
# Dev server (Expo)
npm start                     # Then press i for iOS sim, a for Android
npx expo start -c             # Same, clearing cache

# Native builds (dev client required — Expo Go won't work because of expo-sqlite + audio)
npm run ios                   # expo run:ios
npm run android               # expo run:android
npm run prebuild:ios          # Regenerate ios/ from scratch
npm run rebuild:ios           # Prebuild + open Xcode workspace
npm run open:xcode

# Type check (no separate lint step)
npx tsc

# Detox e2e (iOS sim, release build)
npm run detox:build:ios
npm run detox:test:ios
npm run detox:test:ios:reuse  # Skip rebuild, reuse simulator state
```

Manual iOS sideload (free Apple ID, 7-day app expiry) is documented in `app/iOS_SETUP.md`.

Install deps with `npm install --legacy-peer-deps` if npm complains about React 19 peer ranges.

## Environment Setup

Copy `app/.env.example` to `app/.env`. The only required key is `EXPO_PUBLIC_GEMINI_API_KEY` — it powers STT, TTS, conversation, embeddings, and every async analysis task.

Notable env vars:
- `EXPO_PUBLIC_USE_LIVE_API` — `"true"` switches voice to a single streaming WebSocket. `"false"` (default) uses the REST 3-call pipeline. See `docs/live-api-refactor.md`.
- `EXPO_PUBLIC_LIVE_VOICE_MODEL` — Live API model, currently `gemini-2.5-flash-native-audio-preview-12-2025`.
- `EXPO_PUBLIC_OPENAI_API_KEY` — optional, enables GPT-5 mini as an alternative chat provider for the REST pipeline.
- `EXPO_PUBLIC_PRIMARY_MODEL_PROVIDER` / `EXPO_PUBLIC_PRIMARY_MODEL` — selects conversation model when `USE_LIVE_API=false`.
- Per-task model overrides: `EXPO_PUBLIC_MEMORY_MODEL`, `KNOWLEDGE_MODEL`, `EMBEDDING_MODEL`, `INSIGHTS_MODEL`, `PATTERN_MODEL`, `PROMPT_MODEL`, `THEORY_MODEL` (each with a `_PROVIDER` sibling).
- `EXPO_PUBLIC_GEMINI_TTS_VOICE` — voice name for both REST TTS and Live API (default `Kore`).

## Architecture

### Top-level layout
```
app/
├── app/                # Expo Router screens (typed routes enabled)
│   ├── index.tsx       # Home / record button
│   ├── conversation.tsx
│   ├── processing.tsx  # Post-session synthesis screen
│   ├── summary.tsx
│   ├── history.tsx
│   ├── session/[id].tsx
│   ├── insights.tsx
│   ├── prompts.tsx
│   └── settings/       # personal-knowledge, patterns, theories, preferences
└── src/
    ├── components/     # UI (RecordButton, MessageBubble, PulsingOrb, cards…)
    ├── hooks/          # useSession, useSessions, useInsights, usePatterns, usePrompts, useTheories
    ├── services/       # Core business logic — see below
    ├── theme/          # Colors, typography, spacing
    └── types/          # All shared TS interfaces
```

### Services (`src/services/`)
- **`ai.ts`** — Main brain. STT, TTS, conversation (Gemini + optional OpenAI), memory synthesis, personal-knowledge extraction, embedding generation, semantic memory retrieval. Builds the system prompt that's shared with the Live API.
- **`live.ts`** — `LiveSession` WebSocket client for the Live API path. One socket per conversation; audio in, audio out, system prompt sent once at setup. Auto-reconnects with resumption handle.
- **`audio.ts`** — Recording via `expo-audio`. Returns base64 PCM (16kHz mono) for the Live path or m4a/wav for the REST path. Also handles 24kHz PCM playback for Live audio chunks.
- **`database.ts`** — All SQLite operations (`expo-sqlite`). DB name: `secondbrain.db`.
- **`insights.ts`** — Weekly/monthly trend & growth reports.
- **`patterns.ts`** — Pattern detection across sessions (recurring topics, emotional patterns, behaviors). Has soft-delete and confidence/status state machine.
- **`prompts.ts`** — Generates AI-suggested journal prompts derived from patterns; tracks active/explored/expired status.
- **`theories.ts`** — Working theories about the user, with categories, confidence, evidence, and a `developing/confident/questioning` lifecycle.
- **`personalization.ts`** — Builds the `ConversationContext` (knowledge + relevant memories + active prompts) injected at session start.
- **`api-utils.ts`** — `fetchWithRetry`, timeout controllers, JSON parsing helpers.
- **`haptics.ts`** — `expo-haptics` wrapper.
- **`e2e-bridge.ts`** — Detox-only seed/control hooks.

### Two voice pipelines

The codebase supports both paths simultaneously; `useSession` branches on `USE_LIVE_API`.

**REST pipeline (default, `USE_LIVE_API=false`):** record audio → `ai.transcribeAudio` (Gemini STT) → `ai.generateResponse` (Gemini or OpenAI with full memory context) → `ai.synthesizeSpeech` (Gemini TTS) → play. ~3–5s perceived latency per turn.

**Live API pipeline (`USE_LIVE_API=true`):** one WebSocket per conversation. PCM in, PCM out, transcripts stream incrementally, system prompt sent once at setup and reused for every turn. ~600ms first-audio target. Async synthesis after the session ends still runs on REST. Android PCM recording is best-effort — keep Live disabled on Android until a native PCM recorder is added (see `docs/live-api-refactor.md`).

If a Live session fails to open, the app falls back to REST at runtime.

### Four-layer memory system

Implemented across `ai.ts` (synthesis/retrieval) and `database.ts` (storage):

1. **Raw transcripts** — `sessions` + `messages` tables. Source of truth.
2. **Personal knowledge** — `personal_knowledge` table (single markdown blob, id=`default`). Re-derived/edited after each session. Always loaded into every conversation system prompt.
3. **Session memory nodes** — `memory_nodes`: summary + topics, emotions, events, people, thoughts, unresolved questions. One per session.
4. **Vector embeddings** — `memory_vectors`: typed chunks and highlights with `text-embedding-004` embeddings. Retrieval ranks with similarity (weight 0.7) plus recency decay (60-day half-life, weight 0.3).

### Post-session pipeline (`useSession.processSessionMemory`)

After a session ends, in order: synthesize memory node → update personal knowledge → regenerate memory vectors → detect/update patterns → evaluate theories. Prompt generation runs separately on demand.

### Database schema

`expo-sqlite` (`secondbrain.db`), foreign keys ON. Tables:
- `sessions`, `messages` — transcripts and turns
- `memory_nodes` — structured per-session summaries (Layer 3)
- `personal_knowledge` — markdown blob (Layer 2)
- `memory_vectors` — chunk/highlight embeddings (Layer 4)
- `insights_reports`, `insights` — weekly/monthly reports
- `patterns` — recurring observations with confidence/status (soft-deleted)
- `prompts` — AI-suggested journal prompts with status + expiry
- `theories` — working theories with evidence and lifecycle

### External APIs

- **Gemini** (`generativelanguage.googleapis.com/v1beta`): conversation (`gemini-3.1-flash-preview`), STT (`gemini-3-flash-preview`), TTS (`gemini-3.1-flash-tts-preview`), Live (`gemini-2.5-flash-native-audio-preview-12-2025`), embeddings (`text-embedding-004`).
- **OpenAI** (`api.openai.com/v1`, optional): conversation alternative (`gpt-5-mini`).
- Conversation uses `thinking=minimal`; synthesis tasks use `thinking=medium` (hard-coded per call site).

### Path alias

`@/*` → `src/*` (e.g. `import { colors } from '@/theme'`).

## Design Philosophy

From `docs/conversation_design.md`: the AI should sound like a thoughtful friend, not a therapist. Listen more than interrogate; one question at a time; reference memory naturally ("Didn't this happen before?"), not like a database; match user energy; probe emotions and recurring themes, skip small logistics.

## Documentation in `docs/`

- `live-api-refactor.md` — Live API design, Phase 1 status, model split rationale
- `memory_architecture.md` — Long-form description of the four layers
- `conversation_design.md` — Voice/tone rules for the assistant
- `core_functionlity.md`, `vision.md` — Product intent
- `UX_SPECIFICATION.md`, `IMPROVEMENT_ROADMAP.md` — UX + roadmap
- `specs/FEATURE-*.md` — Per-feature design docs (patterns, prompts, theories, insights, personalization, ChatGPT import)
- `testflight-guide.md` — Release path
