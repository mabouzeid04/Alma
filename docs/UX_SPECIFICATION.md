# SecondBrain UX Specification
**Last Updated:** December 29, 2025
**Status:** v1.0 - Ready for Implementation

## Overview

This document defines the complete user experience for SecondBrain, a voice-first journaling app that builds a personal knowledge graph through natural conversation with AI. The UX is designed to feel **warm, friendly, and effortless** - removing all friction between thought and capture.

## Core Design Principles

### 1. Voice-First, Always
- The entire experience is optimized for voice interaction
- One tap from home to talking - no intermediate screens
- Real-time transcription visible during conversation
- Text interface exists only for reviewing past sessions

### 2. Conversational, Not Transactional
- AI responds at natural pauses, like a real conversation
- Always-listening mode with intelligent response timing
- No manual "stop recording" buttons during conversation
- Conversation ends only when user taps "Done"

### 3. Minimal & Breathing
- Generous white space throughout
- Every screen has a single clear purpose
- No unnecessary UI elements or controls
- Focus stays on the conversation

### 4. Warm & Human
- Visual aesthetic inspired by Anthropic's warm, friendly design
- Rounded typography and soft shapes
- Welcoming animations that feel alive
- Earth tones with warm neutrals

---

## Visual Design System

### Color Palette
**Primary:** Warm earth tones
- Beige: `#F5F1E8` (background)
- Tan: `#D4C5B0` (secondary background)
- Soft Brown: `#A89080` (text secondary)
- Deep Brown: `#4A3F35` (text primary)

**Accents:**
- Warm Orange: `#E88D67` (primary actions, pulsing orb)
- Soft Peach: `#F4B59F` (highlights, hover states)
- Muted Red: `#C85C5C` (delete actions)

**Modes:**
- Light mode (default): Cream/beige backgrounds with warm browns
- Dark mode: Deep charcoal `#2A2420` backgrounds with warm orange accents

### Typography
**Font Family:** Rounded sans-serif (similar to Anthropic's style)
- Primary: Inter Rounded, SF Pro Rounded, or similar
- Fallback: System rounded sans-serif

**Type Scale:**
- Heading 1: 32px, semibold (home greeting)
- Heading 2: 24px, medium (session detail titles)
- Body Large: 18px, regular (transcript text)
- Body: 16px, regular (UI text)
- Caption: 14px, regular (timestamps, metadata)
- Small: 12px, regular (tags)

### Spacing
**Generous & Breathing**
- Base unit: 8px
- Section padding: 24px
- Component spacing: 16px
- Tight spacing (tags, labels): 8px
- Screen margins: 20px horizontal, 16px top/bottom (safe area aware)

### Corner Radius
- Buttons: 24px (pill-shaped for primary)
- Cards/bubbles: 16px
- Small elements: 8px

### Animations
All transitions: 300ms ease-in-out
- Orb pulse: Continuous gentle scale 1.0 → 1.05 over 2s
- Screen transitions: Slide up/down with fade
- Haptic feedback: Light impact on AI response start

---

## Screen Specifications

### 1. Home Screen

**Purpose:** Launch point for conversations. Immediate access with minimal context.

**Layout:**
```
┌─────────────────────────────┐
│                             │
│   Good evening, Mahmoud     │ ← Time-based greeting (H1)
│                             │
│      [Pulsing Orb]          │ ← Large animated orb (120px diameter)
│                             │
│   Tap to start talking      │ ← Subtle hint text (Caption)
│                             │
│                             │
│   Session 47 · 3 day streak │ ← Metadata (Caption, muted)
│                             │
│   ↑ Swipe up for history    │ ← Subtle hint (Caption, very muted)
└─────────────────────────────┘
```

**Elements:**

1. **Time-Based Greeting** (top third)
   - Morning (5am-12pm): "Good morning, Mahmoud"
   - Afternoon (12pm-6pm): "Good afternoon, Mahmoud"
   - Evening (6pm-11pm): "Good evening, Mahmoud"
   - Night (11pm-5am): "Still up, Mahmoud?"
   - Typography: H1, deep brown
   - Centered, generous top margin (60px from safe area)

2. **Pulsing Orb Button** (center)
   - Size: 120px diameter circle
   - Color: Warm orange gradient with subtle radial glow
   - Animation: Continuous gentle pulse (scale 1.0 → 1.05) over 2s, smooth loop
   - Icon: Simple microphone or waveform icon (24px, white)
   - Shadow: Soft, warm shadow (0px 8px 24px rgba(232, 141, 103, 0.3))
   - State: Idle (pulsing) → Pressed (scale to 0.95) → Transition to conversation

3. **Hint Text** (below orb)
   - Text: "Tap to start talking"
   - Typography: Caption, soft brown, 50% opacity
   - Position: 16px below orb

4. **Session Metadata** (bottom third)
   - Text: "Session {count} · {streak} day streak"
   - Typography: Caption, soft brown, 60% opacity
   - Centered
   - Position: 40px from bottom safe area

5. **History Hint** (bottom)
   - Text: "↑ Swipe up for history" or small up arrow icon
   - Typography: Small, very muted (40% opacity)
   - Position: 16px from bottom safe area

**Interactions:**
- **Tap orb:** Instant transition to Conversation Screen, recording starts immediately
- **Swipe up:** Slide up History Screen from bottom, home blurs in background
- **Swipe down on history:** Dismiss history, return to home

**States:**
- Default: Orb pulsing, ready to talk
- Loading (first launch): Brief spinner while initializing, then ready state
- No internet: Orb still works, show subtle warning banner at top

---

### 2. Conversation Screen

**Purpose:** Active conversation space. Real-time transcription, AI responses, always listening.

**Layout:**
```
┌─────────────────────────────┐
│  [Done]                     │ ← Done button (top right)
│                             │
│  ┌───────────────────────┐  │
│  │ Hey, I've been think- │  │ ← Your bubble (right-aligned)
│  │ ing about work today  │  │
│  └───────────────────────┘  │
│                             │
│ ┌─────────────────────────┐ │
│ │ What's on your mind     │ │ ← AI bubble (left-aligned)
│ │ about work?             │ │
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │ Well, my manager said │  │ ← Active typing (live)
│  │ something that...     │  │
│  └───────────────────────┘  │
│                             │
│     [Waveform Animation]    │ ← Waveform (bottom third)
│        ∿∿∿∿∿∿∿∿∿∿∿          │
│                             │
└─────────────────────────────┘
```

**Elements:**

1. **Done Button** (top right)
   - Text: "Done" or "X" icon
   - Typography: Body, deep brown
   - Style: Text button with subtle tap target (44px minimum)
   - Position: 16px from top-right safe area
   - Tap: End session flow begins

2. **Chat Transcript** (scrollable center area)
   - Conversation displayed as chat bubbles (iMessage-style)
   - **Your bubbles:**
     - Alignment: Right
     - Background: Soft peach `#F4B59F`
     - Text: Deep brown
     - Max width: 75% of screen width
     - Padding: 12px 16px
     - Corner radius: 16px (with tail optional)
     - Margin bottom: 8px
   - **AI bubbles:**
     - Alignment: Left
     - Background: Tan `#D4C5B0`
     - Text: Deep brown
     - Max width: 75% of screen width
     - Padding: 12px 16px
     - Corner radius: 16px
     - Margin bottom: 12px
   - **Auto-scroll:** Always scroll to bottom as new text appears
   - **Live transcription:** Your words appear in real-time as you speak, word by word

3. **Waveform Animation** (bottom third)
   - Visual representation of audio activity
   - Height: 80px
   - Style: Smooth, organic waveform bars (10-15 bars)
   - Color: Warm orange with gradient transparency
   - States:
     - **You speaking:** Active animation, bars dancing with your voice
     - **You silent:** Gentle idle pulse
     - **AI processing:** Pulsing glow effect
     - **AI speaking:** Smooth wave animation synchronized to AI voice
   - Position: Fixed at bottom, above safe area
   - Background: Blurred gradient from beige to transparent

4. **AI Response Indicators**
   - **Haptic feedback:** Light impact haptic when AI starts to speak
   - **Waveform pulse:** Waveform glows brighter when AI is generating response
   - **No typing indicator needed** - AI just starts speaking naturally

**Interactions:**
- **Screen loads:** Recording starts immediately, waveform begins
- **You speak:** Transcript appears in real-time in your bubble
- **Natural pause detected (2-3s silence):** AI analyzes if it should respond
  - If question or complete thought detected: AI generates response
  - If mid-sentence or thinking pause: AI waits
- **AI responds:**
  - Haptic feedback (light impact)
  - Waveform pulses
  - AI bubble appears with text
  - AI voice plays through speaker
- **Continuous loop:** After AI finishes, you can continue speaking immediately
- **Tap Done:** End session flow begins

**States:**
- Active conversation (default)
- AI processing (waveform pulsing)
- AI speaking (waveform animated to voice)
- Network error (show small warning, continue recording locally)

**Technical Behavior:**
- Continuous voice recording throughout session
- Real-time transcription using ElevenLabs STT
- Voice activity detection (VAD) to detect pauses
- Sentiment/completion analysis to determine if AI should respond
- AI uses Gemini with conversation history + knowledge base + relevant memories
- ElevenLabs TTS for AI voice responses
- Haptic engine for feedback

---

### 3. Post-Session Flow

**Purpose:** Process the conversation and show insights before returning home.

**Sequence:**

**3a. Processing Animation** (2-4 seconds)
```
┌─────────────────────────────┐
│                             │
│                             │
│      [Animated Orb]         │ ← Pulsing/morphing animation
│                             │
│  Reflecting on your session │ ← Caption text
│         · · ·               │ ← Animated dots
│                             │
│                             │
└─────────────────────────────┘
```
- Centered animated orb (same as home screen but morphing/processing)
- Text: "Reflecting on your session" with animated dots
- Background: Same beige/cream
- Duration: Actual processing time (min 2s for feel, max 6s)

**3b. Memory Summary Screen** (after processing)
```
┌─────────────────────────────┐
│  [X]                        │ ← Close button (top right)
│                             │
│  Session Summary            │ ← H2 title
│                             │
│  You reflected on feeling   │ ← Natural language summary
│  disconnected from friends  │   (Body Large, deep brown)
│  lately and talked about    │
│  your presentation at work. │
│                             │
│  Topics:                    │ ← Caption label
│  [Work] [Loneliness]        │ ← Pill-shaped tags
│  [Presentations]            │
│                             │
│  Emotions:                  │ ← Caption label
│  [Reflective] [Proud]       │ ← Pill-shaped tags
│  [Anxious]                  │
│                             │
│  [View Full Transcript]     │ ← Secondary button
│                             │
│  Session saved · 8:47 PM    │ ← Confirmation (Caption, muted)
│                             │
└─────────────────────────────┘
```

**Elements:**
1. **Close Button** (top right)
   - Icon: X or "Done"
   - Tap: Return to home screen

2. **Title** (H2)
   - Text: "Session Summary"
   - Centered or left-aligned
   - Top margin: 32px

3. **Summary Text** (Body Large)
   - AI-generated natural language summary
   - 2-4 sentences covering main topics, emotions, insights
   - Line height: 1.6 for readability
   - Max width: Comfortable reading width

4. **Topics Tags** (Pill-shaped)
   - Background: Soft brown 20% opacity
   - Text: Deep brown, Small typography
   - Padding: 6px 12px
   - Corner radius: 12px
   - Margin: 6px between tags
   - Display: Wrap horizontally

5. **Emotions Tags** (Pill-shaped)
   - Same style as topics
   - Optional color coding (e.g., anxious = muted red tint)

6. **View Transcript Button** (Secondary)
   - Text: "View Full Transcript"
   - Style: Outlined button or text link
   - Tap: Navigate to Session Detail Screen for this session

7. **Confirmation Text** (Bottom)
   - Text: "Session saved · {timestamp}"
   - Muted, Caption typography
   - Centered

**Interactions:**
- **Auto-display:** Appears automatically after processing completes
- **Tap X/Done:** Smooth transition back to home screen
- **Tap View Transcript:** Navigate to Session Detail Screen
- **Swipe down:** Alternative gesture to close and return home

---

### 4. History / Archive Screen

**Purpose:** Browse and search past conversations.

**Layout:**
```
┌─────────────────────────────┐
│  [← Back]  History          │ ← Header
│                             │
│  [🔍 Search sessions...]    │ ← Search bar
│                             │
│  ┌─────────────────────────┐│
│  │ Today, 8:47 PM          ││ ← Session entry
│  │ Work · Loneliness ·     ││
│  │ Presentations           ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Yesterday, 2:15 PM      ││
│  │ Sarah · Breakup ·       ││
│  │ Emotions                ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Dec 27, 6:30 PM         ││
│  │ Finals · Anxiety        ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

**Elements:**

1. **Header Bar**
   - Background: Cream/beige
   - Height: 60px (+ safe area)
   - Left: Back arrow or swipe-down affordance
   - Center: "History" (H2)
   - Sticky at top

2. **Search Bar**
   - Background: Tan with 50% opacity
   - Icon: Search magnifying glass (left)
   - Placeholder: "Search sessions..."
   - Typography: Body
   - Corner radius: 16px
   - Padding: 12px 16px
   - Margin: 16px horizontal, 12px top
   - Tap: Focus and show keyboard
   - Search: Real-time filter of sessions (searches transcripts, summaries, topics)

3. **Session Entries** (List)
   - Background: White/cream card
   - Border: 1px solid soft brown 10% opacity
   - Corner radius: 12px
   - Padding: 16px
   - Margin: 12px horizontal, 8px vertical
   - Shadow: Subtle (0px 2px 8px rgba(0,0,0,0.04))

   **Entry Content:**
   - **Date/Time** (Body, semibold, deep brown)
     - Format: "Today/Yesterday, HH:MM AM/PM" or "MMM DD, HH:MM AM/PM"
   - **Topics** (Caption, soft brown, 80% opacity)
     - Displayed as inline text with · separators
     - Max 3-4 topics shown, truncate with "..."

   **Entry Interactions:**
   - Tap: Navigate to Session Detail Screen
   - Long press: Show action menu (Delete session)
   - Swipe left: Reveal delete button

4. **Empty State** (if no sessions)
   - Centered message: "No sessions yet"
   - Subtext: "Tap the orb on the home screen to start talking"
   - Typography: Body, muted

**Interactions:**
- **Swipe down from top:** Dismiss history, return to home
- **Tap back button:** Same as swipe down
- **Search:** Type to filter sessions in real-time
- **Tap session:** Navigate to Session Detail Screen
- **Scroll:** Infinite scroll or paginated (load more as user scrolls)

**States:**
- Default: List of sessions
- Searching: Filtered results
- Empty: No sessions message
- Loading: Skeleton cards while fetching

---

### 5. Session Detail Screen

**Purpose:** View full transcript and memory summary for a specific past session.

**Layout:**
```
┌─────────────────────────────┐
│  [← Back]  Dec 28, 8:47 PM  │ ← Header with date
│                             │
│  ─── Summary ───            │ ← Section divider
│                             │
│  You reflected on feeling   │ ← Summary (default open)
│  disconnected from friends  │
│  lately...                  │
│                             │
│  Topics: [Work] [Loneliness]│
│  Emotions: [Reflective]     │
│                             │
│  ─── Transcript ───         │ ← Section divider
│                             │
│  [Expand ▼]                 │ ← Collapsible toggle
│                             │
│ (When expanded:)            │
│  ┌───────────────────────┐  │
│  │ Hey, I've been think- │  │ ← Transcript bubbles
│  │ ing about work today  │  │
│  └───────────────────────┘  │
│ ┌─────────────────────────┐ │
│ │ What's on your mind?    │ │
│ └─────────────────────────┘ │
│  ┌───────────────────────┐  │
│  │ Well, my manager...   │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

**Elements:**

1. **Header Bar**
   - Left: Back arrow
   - Center: Date/time of session (Body, semibold)
   - Background: Cream/beige
   - Height: 60px + safe area

2. **Summary Section** (Always visible)
   - **Divider:** "─── Summary ───" (Caption, muted, centered)
   - **Summary Text:** AI-generated summary (Body Large, line height 1.6)
   - **Topics/Emotions Tags:** Same pill style as post-session screen
   - **Padding:** 20px horizontal
   - **Background:** White/cream

3. **Transcript Section** (Collapsible)
   - **Divider:** "─── Transcript ───"
   - **Toggle:** "[Expand ▼]" / "[Collapse ▲]" (Caption, clickable)
   - **Collapsed (default):** Just toggle visible
   - **Expanded:** Full chat transcript with bubbles (same style as Conversation Screen)
   - **Scrollable:** If transcript is long

4. **Action Button** (optional, bottom)
   - **Delete Session:** Small text button at bottom, muted red color
   - Confirmation dialog before delete

**Interactions:**
- **Tap back:** Return to History Screen
- **Tap expand/collapse:** Toggle transcript visibility
- **Tap delete:** Show confirmation dialog
- **Scroll:** If transcript is long

---

## Key User Flows

### Flow 1: First Time User - Starting First Session
1. Open app → Home screen displays
2. See pulsing orb and greeting
3. Tap orb → Instant transition to Conversation Screen
4. AI greets: "Hey Mahmoud, what's on your mind?"
5. User starts talking → Real-time transcript appears
6. User pauses → AI asks follow-up question
7. Natural back-and-forth continues
8. User taps Done → Processing animation
9. Memory summary appears
10. User reviews summary, taps X
11. Returns to home screen with session count updated

### Flow 2: Returning User - Daily Check-In
1. Open app → Home shows "Session 12 · 4 day streak"
2. Tap orb → Conversation starts
3. AI: "Hey, how's your day going?" (references time of day)
4. User talks about work stress
5. AI: "Last time you felt stressed about work, you mentioned the deadline. Is this related?" (uses memory)
6. Natural conversation continues
7. User taps Done → Summary generated
8. Return to home

### Flow 3: Browsing Past Sessions
1. From home, swipe up → History screen slides up
2. Scroll through sessions, see dates and topics
3. Type in search: "Sarah"
4. Results filter to sessions mentioning Sarah
5. Tap a session → Session Detail opens
6. Read summary, expand transcript
7. Tap back → History
8. Swipe down → Return to home

---

## Interaction Patterns

### Gestures
- **Tap orb (home):** Start conversation
- **Swipe up (home):** Open history
- **Swipe down (history):** Close history, return home
- **Tap Done (conversation):** End session
- **Swipe left on session (history):** Reveal delete
- **Long press session (history):** Action menu

### Haptic Feedback
- **Light impact:** AI starts speaking
- **Medium impact:** Session saved confirmation
- **Soft feedback:** Button taps

### Animations (All 300ms ease-in-out unless noted)
- **Orb pulse:** 2s continuous loop, scale 1.0 → 1.05
- **Screen transitions:** Slide up/down with 300ms fade
- **Button press:** Scale to 0.95 on touch
- **Waveform:** Real-time animation synced to audio
- **Processing animation:** Morphing orb over 2-4s
- **Tag appear:** Subtle fade-in and scale up (200ms)
- **Transcript scroll:** Smooth auto-scroll as new text appears

---

## Edge Cases & Error States

### No Internet Connection
- **On Home:** Small banner at top: "Offline - Conversations will save locally"
- **In Conversation:** Continue recording, show warning that AI won't respond
- **Fallback:** Save transcript locally, process memory when connection returns

### Microphone Permission Denied
- **First tap on orb:** iOS permission dialog
- **If denied:** Modal explaining microphone is required, button to open Settings

### API Failure (ElevenLabs, Gemini)
- **Transcription fails:** Show error in conversation, save audio file for retry
- **AI doesn't respond:** Show bubble: "Sorry, I'm having trouble responding. Keep talking and I'll catch up."
- **TTS fails:** Show text response without voice

### Session Interrupted (App backgrounded, call incoming)
- **Save progress:** Automatically save transcript up to that point
- **Resume option:** On return, show dialog: "Resume your session?" with Yes/No
- **No:** Save as ended session, return to home

### Empty/Short Sessions
- **User taps Done within 10 seconds:** "Are you sure? Your session is very short."
- **If confirmed:** Save anyway, generate minimal summary

### Very Long Sessions
- **After 30 minutes:** Subtle notification: "You've been talking for a while. Feel free to wrap up when ready."
- **No hard limit:** Let user continue as long as they want

### Delete Session Confirmation
- **Swipe left or long press delete:** Dialog: "Delete this session? This can't be undone."
- **Buttons:** Cancel (default), Delete (destructive red)

---

## Accessibility

### Voice Over Support
- All buttons have clear labels
- Transcript bubbles read in order
- Processing states announced
- Orb button: "Start talking button, tap to begin conversation"

### Dynamic Type
- All text scales with system text size settings
- Maintain readable line lengths
- Buttons remain tappable at all sizes

### Color Contrast
- All text meets WCAG AA standards
- Minimum contrast ratio 4.5:1 for body text
- 3:1 for large text and UI elements

### Reduce Motion
- If user enables Reduce Motion:
  - Orb: Static, no pulse
  - Transitions: Instant or simple fade
  - Waveform: Simplified, less dramatic

---

## Technical Requirements

### Performance
- App launch to home: < 1 second
- Orb tap to conversation start: < 300ms
- Real-time transcription latency: < 500ms
- AI response generation: 2-5 seconds (typical)
- Processing animation: 2-6 seconds (actual processing time)

### Audio
- Sample rate: 16kHz or higher for voice
- Format: AAC or WAV
- Continuous recording during session
- Background audio: Continue if user backgrounds app (optional, v1 can stop)

### Storage
- Transcripts: SQLite database
- Audio files: Local file system (optional, may not store raw audio)
- Embeddings: Vector database (SQLite with extension or separate)
- Knowledge base: JSON or SQLite

### API Integrations
- ElevenLabs: Speech-to-text (real-time), Text-to-speech
- Gemini: Conversational AI, memory synthesis
- Local fallbacks: Save transcripts if APIs fail

### Platforms
- iOS: Primary target (SwiftUI or React Native)
- Android: Future (not v1)
- Dark mode: Support light and dark

---

## Out of Scope for V1

These features are explicitly **not** included in v1. They may be considered for future versions:

- Manual transcript editing
- Export functionality (PDF, text file, etc.)
- Multiple conversation templates or modes
- Push notifications or reminders
- Mood charts or analytics visualization
- Social features or sharing
- Voice customization settings (use default warm female voice)
- Multiple languages (English only for v1)
- Widgets or home screen shortcuts
- Apple Watch or wearable integration
- Desktop or web versions

---

## Success Metrics

The UX is successful if:

1. **User starts a session within 30 seconds of opening the app** (minimal friction)
2. **Real-time transcription feels instant** (< 500ms latency)
3. **AI responses feel natural** (not robotic, references past memories)
4. **User returns 3+ times per week** (indicates it's valuable and not annoying)
5. **Session duration averages 5-15 minutes** (indicates depth of engagement)
6. **Memory summaries are accurate** (user trusts the AI's understanding)

---

## Design Review Checklist

Before implementation, verify:

- [ ] Home screen has single clear action (tap orb)
- [ ] No double-tap or multi-step flows to start conversation
- [ ] Real-time transcription is visible during conversation
- [ ] AI responds automatically at natural pauses
- [ ] Done button is always accessible
- [ ] Generous white space throughout
- [ ] Warm earth tone color palette applied
- [ ] Rounded, friendly typography
- [ ] Smooth 300ms animations on all transitions
- [ ] Orb pulses continuously on home screen
- [ ] Haptic feedback on AI response start
- [ ] Memory summary shows immediately after processing
- [ ] History accessible via swipe up
- [ ] Session detail prioritizes summary over transcript
- [ ] Search bar functional in history
- [ ] Dark mode supported
- [ ] No settings menu (keeping it simple for v1)

---

## Implementation Notes

### Recommended Architecture
- **Framework:** React Native with Expo (already in use)
- **Navigation:** React Navigation with custom gestures for swipe
- **State:** Context API or Zustand for app state
- **Audio:** Expo AV for recording, ElevenLabs SDK for transcription/TTS
- **AI:** Google Gemini SDK for conversation and synthesis
- **Database:** expo-sqlite for transcripts and knowledge base
- **Vectors:** SQLite with vector extension or lightweight vector library

### Key Components to Build
1. `HomeScreen` - Orb button, greeting, metadata
2. `ConversationScreen` - Chat bubbles, waveform, real-time transcript
3. `ProcessingScreen` - Animated orb with status
4. `MemorySummaryScreen` - Post-session summary modal
5. `HistoryScreen` - Session list with search
6. `SessionDetailScreen` - Summary + collapsible transcript
7. `PulsingOrb` - Reusable animated orb component
8. `Waveform` - Audio visualization component
9. `ChatBubble` - Message bubble component

### Development Phases
**Phase 1: Core Flow (Week 1-2)**
- Home screen with orb
- Tap to start conversation
- Real-time transcription display
- Done button to end session
- Basic memory synthesis

**Phase 2: AI Integration (Week 2-3)**
- Voice activity detection
- AI response generation at pauses
- Memory retrieval and context loading
- Natural conversation flow

**Phase 3: History & Review (Week 3-4)**
- History screen with swipe gesture
- Session list with search
- Session detail view
- Delete functionality

**Phase 4: Polish (Week 4-5)**
- Animations and haptics
- Dark mode
- Error states and edge cases
- Performance optimization
- Testing and refinement

---

## Appendix: Conversation Flow Example

**Visual Example of Natural Conversation:**

```
Home Screen:
┌─────────────────────────────┐
│  Good evening, Mahmoud      │
│                             │
│      [Pulsing Orb]          │  ← User taps
│   Tap to start talking      │
│                             │
│  Session 12 · 4 day streak  │
└─────────────────────────────┘
          ↓ (instant transition)
Conversation Screen:
┌─────────────────────────────┐
│  [Done]                     │
│                             │
│ ┌─────────────────────────┐ │
│ │ Hey, what's on your     │ │ ← AI opens (auto)
│ │ mind today?             │ │
│ └─────────────────────────┘ │
│                             │
│  [Waveform - You speaking]  │
│        ∿∿∿∿∿∿∿              │
│                             │
└─────────────────────────────┘
          ↓ (user speaks)
┌─────────────────────────────┐
│  [Done]                     │
│                             │
│ ┌─────────────────────────┐ │
│ │ Hey, what's on your     │ │
│ │ mind today?             │ │
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │ I'm feeling stressed  │  │ ← Real-time transcript
│  │ about work again      │  │
│  └───────────────────────┘  │
│                             │
│  [Waveform - Idle]          │
└─────────────────────────────┘
          ↓ (pause detected, AI responds)
┌─────────────────────────────┐
│  [Done]                     │
│                             │
│ ┌─────────────────────────┐ │
│ │ Hey, what's on your     │ │
│ │ mind today?             │ │
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │ I'm feeling stressed  │  │
│  │ about work again      │  │
│  └───────────────────────┘  │
│                             │
│ ┌─────────────────────────┐ │
│ │ Is this about the same  │ │ ← AI response (haptic!)
│ │ project you mentioned   │ │
│ │ last week?              │ │
│ └─────────────────────────┘ │
│                             │
│  [Waveform - AI speaking]   │
└─────────────────────────────┘
          ↓ (conversation continues...)
          ↓ (user taps Done)
Processing Screen:
┌─────────────────────────────┐
│                             │
│      [Morphing Orb]         │
│  Reflecting on your session │
│         · · ·               │
│                             │
└─────────────────────────────┘
          ↓ (2-4 seconds)
Memory Summary Screen:
┌─────────────────────────────┐
│  [X]                        │
│                             │
│  Session Summary            │
│                             │
│  You talked about feeling   │
│  stressed about the same    │
│  work project...            │
│                             │
│  Topics: [Work] [Stress]    │
│  Emotions: [Anxious]        │
│                             │
│  [View Full Transcript]     │
│                             │
│  Session saved · 8:47 PM    │
└─────────────────────────────┘
          ↓ (tap X)
Back to Home Screen:
┌─────────────────────────────┐
│  Good evening, Mahmoud      │
│                             │
│      [Pulsing Orb]          │
│   Tap to start talking      │
│                             │
│  Session 13 · 5 day streak  │ ← Updated!
└─────────────────────────────┘
```

---

**End of Specification**
