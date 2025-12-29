# Second Brain - Voice Journaling App

Voice-first journaling app with AI conversation and memory system.

## Quick Start

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator

## Features

- **One-tap voice recording** - Just tap the big button and talk
- **AI conversation** - Natural follow-up questions, like talking to a friend
- **4-layer memory system**:
  - Raw transcripts (SQLite)
  - Personal knowledge base (auto-extracted facts)
  - Session summaries (structured insights)
  - Vector embeddings (semantic search)
- **Session history** - Review and delete past conversations
- **Dark UI** - Minimal, pleasant design

## Architecture

```
app/
├── app/                    # Screens (Expo Router)
│   ├── index.tsx          # Home with record button
│   ├── conversation.tsx   # Active conversation
│   ├── history.tsx        # Past sessions
│   └── session/[id].tsx   # Session detail
├── src/
│   ├── components/        # UI components
│   ├── hooks/             # React hooks
│   ├── services/          # Core services
│   │   ├── ai.ts         # Voice AI + memory
│   │   ├── audio.ts      # Recording
│   │   ├── database.ts   # SQLite
│   │   └── haptics.ts    # Feedback
│   └── theme/            # Design system
```

## Memory System

### Layer 1: Raw Transcripts
Full conversation history stored in SQLite.

### Layer 2: Personal Knowledge Base
Auto-extracted facts that persist across sessions:
- Biographical (college, job, age)
- Relationships (girlfriend, friends, family)
- Preferences (favorites, habits)
- Goals (aspirations)

### Layer 3: Session Memory Nodes
Structured summaries after each session:
- Topics discussed
- Emotional states
- Events mentioned
- Insights and reflections

### Layer 4: Vector Embeddings
Gemini embeddings for semantic search - finds similar past conversations based on meaning, not keywords.

## How It Works

1. **Start session** → Loads all personal facts + past memories
2. **You talk** → Transcribed via ElevenLabs
3. **AI responds** → Uses Gemini with:
   - Personal knowledge base (always)
   - Top 3 relevant past memories (semantic search)
   - Current conversation history
4. **End session** →
   - Memory synthesized
   - Personal facts extracted/updated
   - Vector embedding generated

## Tech Stack

- **React Native** (Expo)
- **ElevenLabs** - Speech-to-text, Text-to-speech
- **Gemini 2.0 Flash** - Conversation AI, embeddings
- **SQLite** - Local storage
- **TypeScript** - Type safety
