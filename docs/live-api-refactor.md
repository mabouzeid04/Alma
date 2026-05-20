# Live API Refactor Plan

> Status: **Phase 1 implemented** — code complete and type-checking clean.
> Device testing (iOS + Android) and the Android PCM spike remain. See
> "Implementation status" below.
> Branch: `feature/google-tts-stt`.

## Why

Each voice turn today makes **3 sequential REST calls** orchestrated in [`useSession.stopRecording`](../app/src/hooks/useSession.ts#L158-L284):

1. **STT** — `gemini-3-flash-preview` (audio → text), [`ai.transcribeAudio`](../app/src/services/ai.ts#L134-L203)
2. **LLM** — `gemini-3-flash-preview` (text + ~5–20k tokens of memory context → text), [`ai.generateResponse`](../app/src/services/ai.ts#L483-L552)
3. **TTS** — `gemini-3.1-flash-tts-preview` (text → audio), [`ai.synthesizeSpeech`](../app/src/services/ai.ts#L209-L276)

Perceived latency: ~3–5s per turn. The Live API replaces all three with one bidirectional WebSocket: audio in, audio out, no intermediate text round-trips, system prompt cached for the whole session.

Expected gains:
- **Latency:** first audio out in ~600ms (Google's published target), ~5× faster perceived
- **Cost:** ~4–6× cheaper per turn, dominated by no longer paying TTS audio output tokens on every turn AND not re-sending the system prompt on every turn
- **Quality:** native-audio model preserves tone/mood/pacing — matches the "thoughtful friend" design goal in [conversation_design.md](conversation_design.md)

## Implementation status

Phase 1 is implemented in code. The remaining work is device verification,
which cannot be done from a code environment.

**Done:**
- [x] `LiveSession` WebSocket client — [app/src/services/live.ts](../app/src/services/live.ts) (new file; kept out of the already-1450-line `ai.ts`)
- [x] PCM recording config, WAV-header stripping, and 24kHz PCM playback — [app/src/services/audio.ts](../app/src/services/audio.ts)
- [x] `buildSystemPrompt` exported with a `mode: 'live'` / `greeting` option — [app/src/services/ai.ts](../app/src/services/ai.ts)
- [x] Voice loop rewired to drive `LiveSession`: per-conversation session, streaming transcripts, turn-complete persistence — [app/src/hooks/useSession.ts](../app/src/hooks/useSession.ts)
- [x] `LiveSessionCallbacks` type — [app/src/types/index.ts](../app/src/types/index.ts)
- [x] Feature flag `EXPO_PUBLIC_USE_LIVE_API` with fallback to the REST voice pipeline — both build-time and at runtime if the Live session fails to open
- [x] Analysis models bumped `gemini-3-flash-preview` → `gemini-3.1-flash-preview` (ai, insights, patterns, theories, prompts)
- [x] App type-checks (`npx tsc`) with no new errors

**Pending (needs a device/simulator):**
- [ ] **Android PCM spike** — `expo-audio` records raw PCM cleanly on iOS (LINEARPCM/WAV), but Android's `MediaRecorder` cannot emit raw PCM. The Android branch in `audio.ts` is best-effort: if it produces a non-WAV file, the Live path logs a clear error. Until a streaming recorder or native module is added, `EXPO_PUBLIC_USE_LIVE_API` may need to stay `false` on Android.
- [ ] End-to-end voice test on iOS: greeting, turn-taking, transcript bubbles, audio playback
- [ ] Latency + cost measurement against the targets in this doc
- [ ] WebSocket drop / app-backgrounding behaviour

**Deviations from the original plan:**
- `LiveSession` lives in its own `live.ts`, not inside `ai.ts` — `ai.ts` was already ~1450 lines.
- The session resumption handle is kept in memory (used for in-conversation reconnects only), not persisted to AsyncStorage — a conversation does not survive an app kill, so cross-restart persistence buys nothing.
- `buildSystemPrompt` gained an options arg rather than a separate `buildVoiceSystemPrompt` function — less duplication, REST callers unaffected.

## Model split (decided)

| Workload | Model | Why |
|---|---|---|
| Live voice loop | `gemini-2.5-flash-native-audio-preview-12-2025` | 128k context window fits our injected memory comfortably. Native audio = better voice naturalness. The 3.x branch has no native-audio variant yet — 3.1 Flash Live only offers 32k, which our system prompt + accumulated audio would exceed mid-session. |
| Memory synthesis, knowledge extraction, pattern detection, theory evaluation, prompt generation | `gemini-3.1-flash-preview` | Latest reasoning, runs async after session ends, latency irrelevant. Upgrade from current `gemini-3-flash-preview`. |
| Embeddings | `text-embedding-004` | Unchanged. |

When Google ships a `gemini-3.x-flash-native-audio-*`, swap the voice model — the architecture below doesn't change.

## Target architecture

```
[Conversation screen mount]
        │
        ▼
[Open WebSocket session]
   - send setup with full systemInstruction (personal knowledge,
     memories, vectors, conversation context — same data we build today)
   - enable inputAudioTranscription + outputAudioTranscription
   - enable contextWindowCompression { slidingWindow: {} }
   - enable sessionResumption (persist handle)
        │
        ▼
[Greeting] ─ send text turn → model speaks greeting
        │
        ▼
┌───────────────────────────────┐
│ User taps record              │
│   → record PCM @ 16kHz mono   │
│ User taps stop                │
│   → send PCM blob + endTurn   │
│   → input transcript arrives  │ ─── stream into user Message bubble
│   → audio chunks arrive       │ ─── buffer (Phase 1)
│   → output transcript arrives │ ─── stream into assistant Message bubble
│   → turncomplete              │ ─── persist both messages, play buffered audio
└───────────────────────────────┘
        │   (repeat per turn, same session)
        ▼
[User taps Done]
   - close session
   - hand off to processing screen
        │
        ▼
[processSessionMemory] ─ unchanged REST flow:
   synthesizeMemory → updatePersonalKnowledge →
   generateMemoryVectors → detectAndUpdatePatterns →
   evaluateTheories (all on 3.1 Flash)
```

**One session per conversation** (not per turn). System prompt is large; sending it once per conversation instead of per turn is the biggest cost lever.

## Phased rollout

The original draft proposed full PCM streaming from day one. That bundles two changes — protocol swap AND audio I/O rewrite — and the audio rewrite is the only thing that can blow up the effort estimate. Split them:

### Phase 1: WebSocket protocol swap (batched audio per turn)

Keep the current tap-to-record-tap-to-stop UX. After stop, send the full recorded PCM as a single blob over the existing WebSocket session, then receive streamed audio response.

**Wins captured in Phase 1:**
- Eliminates separate STT call (Live API does it as part of the turn)
- Eliminates separate TTS call (audio out is part of the turn)
- System prompt sent once per session, not per turn
- Audio response is buffered per turn then played (streaming chunk-by-chunk playback is a Phase 2 polish)
- WebSocket warm-up cost paid once at conversation start

**What Phase 1 does NOT give us:**
- Real-time input transcription as the user speaks (transcript still arrives after stop)
- Barge-in / interruption (user can't talk over Alma)
- Server-side VAD (we keep manual tap-to-stop)

These are nice-to-haves layered on Phase 2.

### Phase 2: True streaming input (optional, later)

Swap [`audio.ts`](../app/src/services/audio.ts) to a streaming-capable recorder (likely `react-native-live-audio-stream` or a small native module) that emits PCM chunks via callback. Forward chunks to the session as they arrive via `sendRealtimeInput`. Enable server-side VAD for auto-end-of-turn. Adds barge-in support.

Ship Phase 1 first. Decide Phase 2 from real usage data.

## File-by-file changes (Phase 1)

### `app/src/services/live.ts` (new)
`LiveSession` class wrapping the raw WebSocket protocol. Public surface:
- `connect(systemPrompt, callbacks: LiveSessionCallbacks)` — opens the socket, sends setup, resolves on `setupComplete`
- `sendAudioTurn(pcmBase64)` — sends the PCM clip + `audioStreamEnd`
- `sendTextTurn(text)` — used to trigger the greeting
- `close()`, `isConnected`
- Internally: setup message, in-memory resumption handle, sliding-window compression, 3-attempt reconnect

### `app/src/services/ai.ts`
- **Changed:** `buildSystemPrompt` is now exported and takes a `SystemPromptOptions` arg (`mode: 'rest' | 'live'`, `greeting`). REST callers are unaffected (mode defaults to `rest`).
- **Changed:** `DEFAULT_MODELS.gemini` bumped to `gemini-3.1-flash-preview`.
- **Keep unchanged:** `synthesizeMemory`, `updatePersonalKnowledge`, `generateMemoryVectors`, `findRelevantMemories`, `findRelevantMemoryVectors`, `generateEmbedding`.
- **Deprecated but retained (feature-flag fallback):** `transcribeAudio`, `synthesizeSpeech`, the voice path of `generateResponse`. Delete after the dogfooding period.

### `app/src/services/audio.ts`
- **Change recording config:** record raw PCM 16-bit mono @ 16kHz instead of AAC `.m4a`. Use custom `RecordingOptions`:
  - iOS: `ios: { outputFormat: 'lpcm', sampleRate: 16000, numberOfChannels: 1, bitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false }`
  - Android: `android: { outputFormat: 'default', audioEncoder: 'default', sampleRate: 16000, numberOfChannels: 1 }` — **needs verification**; Android's `AudioRecorder` historically writes container formats, may need a different approach (this is the only real Phase 1 unknown)
- **Add:** `playPcmChunk(base64Chunk: string)` — appends to a playback queue. Live API output is 24kHz PCM. Either:
  - Buffer all chunks → wrap in WAV header (reuse existing `pcmToWav` from `ai.ts`) → play one file when turn completes (simpler, smaller perceived-latency win)
  - Stream chunks into a continuous player (bigger win, more work — recommend deferring to Phase 2 unless straightforward)
- **Keep:** `startRecording`/`stopRecording`/`pauseRecording`/`resumeRecording` signatures and metering — UX unchanged.

### `app/src/hooks/useSession.ts`
- **`startSession`:**
  - After loading memories/vectors, call `buildSystemPrompt(...)` and `buildConversationContext(...)` once (same data as today, just at session start instead of per turn)
  - Open `LiveSession`, wire callbacks to React state + database persistence
  - Replace [the `synthesizeSpeech` + `playAudio` greeting block](../app/src/hooks/useSession.ts#L109-L137) with `session.sendTextTurn(greeting)` — model speaks the greeting using the Live API
- **`stopRecording`:**
  - Stop expo-audio recorder, read the PCM file as base64
  - Call `session.sendAudioTurn(pcmBase64)`
  - State transitions driven by Live API callbacks instead of REST call awaits:
    - `onInputTranscript` → persist user `Message`, advance state from `listening` → `processing`
    - `onAudioChunk` → enqueue, advance state to `responding` on first chunk
    - `onOutputTranscript` → persist assistant `Message`
    - `onTurnComplete` → state back to `idle`
- **`endSession`/`prepareEndSession`:** add `session.close()` before navigation. Otherwise unchanged.
- **`processSessionMemory`** (lines 15-44): **unchanged.** All async memory work stays on REST.

### `app/src/types/index.ts`
- Add types for Live API messages: `LiveSetupMessage`, `LiveServerContent`, `LiveSessionResumptionUpdate`, etc. Keep narrow — only the fields we actually read.

### `app/app/conversation.tsx`
- No structural changes. State machine and UI bindings stay the same — the new flow drives the same `conversationState` values that [`ConversationStatus`](../app/src/components/ConversationStatus.tsx) and [`WaveformVisualizer`](../app/src/components/WaveformVisualizer.tsx) already render.

### `app/.env.example`
- Add: `EXPO_PUBLIC_LIVE_VOICE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025`
- Add: `EXPO_PUBLIC_USE_LIVE_API=true` (feature flag for rollback)
- Update default analysis model env vars from `gemini-3-flash-preview` → `gemini-3.1-flash-preview` in `ai.ts`, `patterns.ts`, `theories.ts`, `prompts.ts`

## State machine mapping (preserves current UX)

Today's `ConversationState`: `idle | listening | transcribing | processing | responding | paused`.

| Current trigger | Live API equivalent |
|---|---|
| `startRecording()` → `'listening'` | unchanged (expo-audio recorder still starts on user tap) |
| Awaiting `transcribeAudio` → `'transcribing'` | First `inputTranscription` arriving after `sendAudioTurn` (often within ~200ms) |
| Awaiting `generateResponse` → `'processing'` | Between input transcript complete and first audio chunk |
| Playing TTS audio → `'responding'` | First `onAudioChunk` arrives → set `'responding'` |
| `onTurnComplete` → `'idle'` | unchanged |
| `pauseRecording`/`resumeRecording` → `'paused'`/`'listening'` | unchanged (local recorder pause; the Live session stays open) |

UI components do **not** change. `ConversationStatus` and `WaveformVisualizer` keep reading `conversationState`.

## SDK choice: raw WebSocket (implemented)

The new unified `@google/genai` SDK has a `live.connect()` helper, but our app uses raw `fetch` (no Gemini SDK calls anywhere — `@google/generative-ai@0.24.1` is in package.json but unused). `live.ts` uses the raw WebSocket endpoint to avoid a new dependency and any RN compatibility risk:

- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
- React Native provides a global `WebSocket`. No new dependency.
- Protocol is JSON-over-WebSocket: client sends `setup`, then `realtimeInput` (audio) / `clientContent` (text); server replies with `setupComplete`, `serverContent` (`modelTurn` audio, `inputTranscription`, `outputTranscription`, `turnComplete`), and `sessionResumptionUpdate`.
- One caveat the device test must confirm: the WebSocket message-frame shapes (`setup` wrapper key, `realtimeInput.audio`) were written against Google's docs, not verified on a running device. If setup is rejected, that's the first place to look.

Revisit `@google/genai` only if the raw protocol proves fragile.

## Memory injection (unchanged data, different delivery)

The setup message's `systemInstruction.parts[0].text` takes the entire output of [`buildSystemPrompt`](../app/src/services/ai.ts#L1309-L1457). Same content, sent once per session. No changes to:

- [`buildSystemPrompt`](../app/src/services/ai.ts#L1309-L1457)
- [`findRelevantMemories`](../app/src/services/ai.ts#L1201-L1235) / [`findRelevantMemoryVectors`](../app/src/services/ai.ts#L1237-L1268)
- [`buildConversationContext`](../app/src/services/personalization.ts) and everything it pulls in (emotional baseline, relevant patterns, topic histories, unresolved questions, relationship patterns, probe opportunities)
- Personal knowledge layer

These all run once at `startSession` instead of once per turn — which is itself a small latency win on the first turn.

## Session resilience

- **`contextWindowCompression: { slidingWindow: {} }`** — 128k window is large but a long journaling session with extensive memory context could still trip it. Sliding window keeps the session alive by evicting oldest turns.
- **`sessionResumption`** — the `newHandle` from each `SessionResumptionUpdate` is held in memory; on an unexpected WebSocket drop, `LiveSession` reconnects with that handle to resume without re-sending the system prompt. Not persisted to disk — a conversation does not outlive the app process, so the handle only needs to survive a mid-conversation drop.
- **WebSocket drop handling** — `LiveSession` auto-reconnects up to 3 times with the resumption handle. After that it surfaces an error via `onError`. (A visible "reconnecting…" UI state is a polish item, not yet wired.)

## Cost & latency targets

| | Old (3 REST calls) | New (Phase 1 Live API) |
|---|---|---|
| First-audio-out latency | ~3–5s after user stops | ~600ms after user stops |
| Cost per turn (5s in / 5s out, 5k-token sys prompt) | ~$0.03–0.04 | ~$0.005–0.01 |
| Sys prompt resends | every turn | once per session |
| WebSocket setup cost | n/a | once per conversation |

Add a debug log of token usage from `usageMetadata` in server messages — verify cost projections after a week of dogfooding.

## Risks & unknowns

1. **Android PCM recording with expo-audio** — iOS LPCM config is well-documented. Android may require either a custom `RecordingOptions` setup or swapping to a different recorder. **Spike this first**, 1 hour, before committing to the broader refactor.
2. **`gemini-2.5-flash-native-audio-preview-12-2025` is a preview model** — rate limits are tighter; model ID may change. Pin the dated suffix and monitor Google's release notes.
3. **Output audio playback continuity** — if we batch chunks per turn (recommended for Phase 1), we lose some perceived latency but keep playback simple. Streaming chunks into a continuous player is a Phase 2 thing.
4. **WebSocket lifecycle vs React Native app backgrounding** — if user backgrounds the app mid-conversation, the WS will likely drop. Use `sessionResumption` to recover. May need `AppState` listener to close-and-reopen cleanly.

## Out of scope for Phase 1

- True streaming input (Phase 2)
- Barge-in / interruption handling (Phase 2)
- Server-side VAD (Phase 2 — keep manual tap-to-stop)
- Tool / function calling in the live loop
- Multi-voice or per-user voice selection beyond current `EXPO_PUBLIC_GEMINI_TTS_VOICE`
- Replacing analysis models — they stay on REST with the 3-flash → 3.1-flash bump

## Rollout

1. Ship Phase 1 behind `EXPO_PUBLIC_USE_LIVE_API` feature flag (default `false`)
2. Internal TestFlight build with flag on
3. Dogfood for a week — verify latency, cost, UX parity, transcription accuracy, no regressions in memory recall
4. Flip flag default to `true`
5. After 2 weeks stable in production, delete the deprecated REST voice path (`transcribeAudio`, `synthesizeSpeech`, voice path of `generateResponse`)

## Effort estimate (Phase 1)

| Task | Estimate | Status |
|---|---|---|
| `LiveSession` class + WebSocket protocol | 1 day | done |
| `useSession` rewrite + state machine wiring | 1 day | done |
| `audio.ts` PCM recording + playback + WAV wrapping | 0.5 day | done |
| Feature flag, fallback path, error handling, reconnection | 0.5 day | done |
| Audio format spike (Android PCM) | 1 hour, +1 day if blocked | **pending — needs a device** |
| Testing on iOS + Android, latency/cost verification | 1 day | **pending — needs a device** |

The code for Phase 1 is written and type-checks. What's left is device-bound:
the Android PCM spike and end-to-end verification. Until the iOS path is
confirmed on a real build, treat the implementation as unverified — the
WebSocket protocol and `expo-audio` PCM config were written against
documentation, not a running device.
