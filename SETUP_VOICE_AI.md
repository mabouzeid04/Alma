# SecondBrain Voice AI Setup Guide

This guide will help you set up ElevenLabs Text-to-Speech and Gemini 3.0 Flash AI for your SecondBrain journaling app.

## Prerequisites

1. **ElevenLabs Account**: Sign up at [https://elevenlabs.io](https://elevenlabs.io)
2. **Google AI Studio Account**: Get API key at [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## Setup Steps

### 1. Get API Keys

#### ElevenLabs API Key
1. Go to [https://elevenlabs.io/app/profile](https://elevenlabs.io/app/profile)
2. Navigate to "API Keys" section
3. Create a new API key
4. Copy the API key

#### Gemini API Key
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the generated API key

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp app/.env.example app/.env
   ```

2. Edit `app/.env` and add your API keys:
   ```env
   EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   EXPO_PUBLIC_ELEVENLABS_VOICE_ID=21m00Tcm4Tlv7q8lAAiM  # Optional: Rachel voice
   ```

### 3. Install Dependencies

The required packages are already installed:
- `@elevenlabs/client` - ElevenLabs API client
- `@google/generative-ai` - Google Gemini API client

### 4. Test the Integration

1. Start your Expo development server:
   ```bash
   cd app
   npm start
   ```

2. Open the app on your device/simulator

3. Start a new conversation session

4. The AI should now:
   - Greet you with a time-appropriate message
   - Transcribe your speech using ElevenLabs ASR
   - Generate responses using Gemini 3.0 Flash
   - Speak responses using ElevenLabs TTS

## Features Implemented

### 🎙️ Speech-to-Text (ElevenLabs)
- High-quality transcription with confidence scores
- Real-time audio processing
- Automatic language detection

### 🤖 Conversational AI (Gemini 3.0 Flash)
- Follows SecondBrain conversation design guidelines
- Sounds like a thoughtful friend, not a therapist
- Remembers past conversations naturally
- Asks one question at a time
- Validates emotions without being cheesy

### 🔊 Text-to-Speech (ElevenLabs)
- Natural-sounding voice synthesis
- Rachel voice (friendly female voice)
- Adjustable voice settings (stability, style, similarity)
- Real-time audio generation

### 🧠 Memory Synthesis
- AI-powered analysis of conversation transcripts
- Extracts topics, emotions, events, and insights
- Semantic search for relevant past memories
- Structured knowledge building over time

## Troubleshooting

### API Key Issues
- Check that your `.env` file exists and contains the correct keys
- Ensure keys start with `EXPO_PUBLIC_` prefix
- Restart your Expo development server after changing environment variables

### Voice Not Working
- Verify your ElevenLabs account has credits
- Check that the voice ID is valid (default: Rachel)
- Ensure microphone permissions are granted

### AI Not Responding
- Confirm Gemini API key is valid and has quota
- Check network connectivity
- Look for error messages in the console

### Performance Issues
- Voice processing may take 1-2 seconds for initial setup
- Large conversations may impact memory synthesis speed
- Consider implementing caching for repeated operations

## Billing & Usage

### ElevenLabs Pricing
- Pay-per-minute for voice synthesis
- Free tier available for testing
- Check [ElevenLabs pricing](https://elevenlabs.io/pricing) for details

### Gemini Pricing
- Pay-per-token for text generation
- Generous free tier for development
- See [Google AI pricing](https://ai.google.dev/pricing) for details

## Next Steps

1. **Test extensively** with various conversation scenarios
2. **Monitor API usage** to optimize costs
3. **Fine-tune prompts** based on user feedback
4. **Add voice customization** options in settings
5. **Implement offline fallback** for when API is unavailable

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify API keys and network connectivity
3. Review the ElevenLabs and Gemini documentation
4. Test with simple API calls first before full integration

The integration is designed to gracefully degrade - if AI services fail, the app will still work with basic transcription and local responses.
