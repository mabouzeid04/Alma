# Quick Start Guide

## 1. Start the App

```bash
cd app
npm start
```

## 2. Open on Device

**iOS Simulator:**
Press `i` in the terminal

**Physical iPhone:**
Scan the QR code with your camera

## 3. Use the App

### First Session
1. Tap the big purple button on home screen
2. Start talking - tell it about your day, what's on your mind
3. It will ask follow-up questions
4. Tap again to stop recording
5. AI processes and responds with voice
6. Keep going back and forth
7. Tap "Done" when finished

### What to Try

**Session 1:**
"I'm studying Computer Science at UCSD. My girlfriend Sarah is stressed about finals coming up."

**Session 2 (next day):**
"I'm worried about Sarah..."
→ The AI should remember Sarah and ask how finals are going

**Session 3:**
"I broke up with Sarah yesterday..."
→ Personal knowledge base updates automatically

### View History
- Tap "View all sessions" from home
- See all past conversations
- Tap any session to view full transcript and memory summary
- Swipe to delete

## How the Memory Works

**During Conversation:**
- AI always knows your personal facts (school, relationships, preferences)
- Searches past memories for similar topics/emotions
- References them naturally in questions

**After Session:**
- Extracts new facts about you (automatically)
- Summarizes what you talked about
- Creates searchable memory with topics, emotions, insights

**Over Time:**
- AI gets better at asking questions
- Remembers patterns (you always feel anxious before presentations)
- Connects dots across conversations

## Troubleshooting

**No voice response?**
- Check .env file has API keys
- Look at terminal for errors

**Transcription failed?**
- Make sure microphone permission is granted
- Check ElevenLabs API key is valid

**AI seems generic?**
- Have a few sessions first - memory builds over time
- Talk about specific people, places, feelings

**App crashes?**
- Clear Expo cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install --legacy-peer-deps`

## Tips for Best Experience

1. **Be specific** - Names, places, emotions make better memories
2. **Talk naturally** - It's voice, not text. Ramble if you want.
3. **Have multiple sessions** - The AI learns your patterns over time
4. **Check history** - See what the AI extracted from your conversations
5. **Trust the process** - First session will be basic, gets better fast

## What's Stored

All data is stored **locally on your device** in SQLite:
- Raw conversation transcripts
- Personal knowledge base (your facts)
- Memory summaries
- Vector embeddings

Nothing is sent to cloud storage. Only API calls are:
- ElevenLabs for voice (real-time, not stored)
- Gemini for AI responses (not stored)
