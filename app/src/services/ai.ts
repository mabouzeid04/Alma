/**
 * AI Service - Second Brain Memory System
 *
 * Implements the four-layer memory architecture:
 * 1. Raw Transcripts (stored in database)
 * 2. Personal Knowledge Base (persistent facts, always in context)
 * 3. Session Memory Nodes (structured summaries per session)
 * 4. Vector Embeddings (semantic search)
 *
 * Uses ElevenLabs for voice (REST API) and Gemini for AI.
 */

import { Message, MemoryNode, PersonalFact, JournalSession } from '../types';
import { v4 as uuid } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, friendly

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// =============================================================================
// Types
// =============================================================================

export interface AIConfig {
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
  voiceId?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
}

export interface AIResponse {
  text: string;
  audioUri?: string;
}

interface PersonalFactUpdate {
  action: 'add' | 'update' | 'deactivate';
  category: PersonalFact['category'];
  key: string;
  value: string;
  context?: string;
  previousFactId?: string;
}

// =============================================================================
// State
// =============================================================================

let isInitialized = false;
let activeVoiceId = ELEVENLABS_VOICE_ID;

// =============================================================================
// Initialization
// =============================================================================

export async function initializeAI(config?: AIConfig): Promise<void> {
  if (config?.voiceId) {
    activeVoiceId = config.voiceId;
  }

  const hasElevenLabs = !!(config?.elevenLabsApiKey || ELEVENLABS_API_KEY);
  const hasGemini = !!(config?.geminiApiKey || GEMINI_API_KEY);

  if (!hasElevenLabs || !hasGemini) {
    console.warn('⚠️ Missing API keys. Set EXPO_PUBLIC_ELEVENLABS_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY');
  }

  isInitialized = true;
  console.log('AI Service initialized');
}

// =============================================================================
// Speech-to-Text (ElevenLabs Scribe)
// =============================================================================

export async function transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
  if (!ELEVENLABS_API_KEY) {
    return { text: '[No API key - transcription unavailable]', confidence: 0 };
  }

  try {
    console.log('🎙️ Starting transcription for:', audioUri);

    // Create form data with React Native compatible file object
    const formData = new FormData();

    // React Native requires this specific format for file uploads
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', 'eng'); // Force English transcription

    console.log('📤 Sending to ElevenLabs Scribe API...');
    const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        // Don't set Content-Type - fetch will set it automatically with boundary
      },
      body: formData,
    });

    console.log('📡 Transcription response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Transcription error response:', errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Transcription result:', result.text?.substring(0, 50));

    return {
      text: result.text || '',
      confidence: result.confidence || 0.9,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return { text: '[Transcription failed]', confidence: 0 };
  }
}

// =============================================================================
// Text-to-Speech (ElevenLabs)
// =============================================================================

export async function synthesizeSpeech(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log('⏭️ Skipping TTS - no API key');
    return null;
  }

  try {
    console.log('🎤 Starting TTS for text:', text.substring(0, 50));
    console.log('🔑 Using voice ID:', activeVoiceId);
    console.log('🔑 API key present:', !!ELEVENLABS_API_KEY, 'length:', ELEVENLABS_API_KEY?.length);
    console.log('🌐 TTS URL:', `${ELEVENLABS_API_URL}/text-to-speech/${activeVoiceId}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for TTS

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${activeVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    console.log('📡 TTS response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ TTS failed with status:', response.status);
      console.error('❌ TTS error body:', errorBody);
      throw new Error(`TTS failed: ${response.status} - ${errorBody}`);
    }

    // Convert to base64 data URI for React Native
    console.log('🔄 Converting audio to base64...');
    const audioBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    console.log('✅ TTS complete, audio size:', base64.length);
    return `data:audio/mpeg;base64,${base64}`;
  } catch (error) {
    console.error('❌ TTS error:', error);
    return null; // Return null so conversation continues without audio
  }
}

// =============================================================================
// Conversation Response (Gemini)
// =============================================================================

export async function generateResponse(
  messages: Message[],
  personalFacts: PersonalFact[],
  relevantMemories: MemoryNode[]
): Promise<AIResponse> {
  if (!GEMINI_API_KEY) {
    console.error('❌ No Gemini API key found');
    return { text: "I'm listening. What's on your mind?" };
  }

  try {
    const systemPrompt = buildSystemPrompt(personalFacts, relevantMemories);
    const conversationHistory = formatConversationHistory(messages);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + conversationHistory }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
            topP: 0.9,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "What's on your mind?";

    const audioUri = await synthesizeSpeech(text);

    return { text, audioUri: audioUri || undefined };
  } catch (error) {
    console.error('❌ Response generation error:', error);
    return { text: "I'm here. What would you like to talk about?" };
  }
}

// =============================================================================
// Memory Synthesis (Layer 3: Session Memory Nodes)
// =============================================================================

export async function synthesizeMemory(session: JournalSession): Promise<MemoryNode> {
  if (!GEMINI_API_KEY || session.messages.length === 0) {
    return createEmptyMemory(session.id);
  }

  try {
    const transcript = formatTranscriptForAnalysis(session.messages);

    const prompt = `Analyze this voice journal conversation and extract structured insights.

CONVERSATION:
${transcript}

Extract the following as JSON (be specific and genuine, not generic):
{
  "summary": "2-3 sentence summary capturing the essence of what was discussed",
  "topics": ["specific topics discussed, not generic categories"],
  "emotions": ["emotional states expressed: anxious, excited, frustrated, content, etc."],
  "events": ["specific events mentioned: 'gave presentation', 'had argument with mom'"],
  "peopleMentioned": ["names of people mentioned and brief context"],
  "thoughts": ["key insights, reflections, or realizations expressed"],
  "unresolvedQuestions": ["questions or dilemmas still being worked through"]
}

Focus on substance. If they just mentioned something in passing, don't include it. If they dwelled on something emotional, capture that. Return only valid JSON.`;

    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Memory synthesis failed: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createEmptyMemory(session.id);
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Generate embedding for semantic search
    const embeddingText = `${analysis.summary} ${analysis.topics?.join(' ')} ${analysis.emotions?.join(' ')} ${analysis.thoughts?.join(' ')}`;
    const embedding = await generateEmbedding(embeddingText);

    return {
      id: uuid(),
      sessionId: session.id,
      createdAt: new Date(),
      summary: analysis.summary || '',
      topics: analysis.topics || [],
      emotions: analysis.emotions || [],
      events: analysis.events || [],
      peopleMentioned: analysis.peopleMentioned || [],
      thoughts: analysis.thoughts || [],
      unresolvedQuestions: analysis.unresolvedQuestions || [],
      embedding,
    };
  } catch (error) {
    console.error('Memory synthesis error:', error);
    return createEmptyMemory(session.id);
  }
}

// =============================================================================
// Personal Knowledge Extraction (Layer 2: Personal Knowledge Base)
// =============================================================================

export async function updatePersonalKnowledge(
  session: JournalSession,
  existingFacts: PersonalFact[]
): Promise<PersonalFact[]> {
  if (!GEMINI_API_KEY || session.messages.length === 0) {
    return [];
  }

  try {
    const transcript = formatTranscriptForAnalysis(session.messages);
    const existingFactsFormatted = existingFacts
      .map((f) => `${f.category}: ${f.key} = ${f.value}${f.context ? ` (${f.context})` : ''}`)
      .join('\n');

    const prompt = `Analyze this journal conversation to identify PERSISTENT facts about the user that should be remembered long-term.

EXISTING KNOWN FACTS:
${existingFactsFormatted || '(none yet)'}

CONVERSATION:
${transcript}

Look for NEW or CHANGED information about:
- biographical: college, major, hometown, job, age
- preferences: favorite things, dislikes, habits
- relationships: names of girlfriend/boyfriend, friends, family, coworkers
- goals: aspirations, things they're working toward
- habits: routines, regular activities

Rules:
- Only extract facts explicitly stated or strongly implied
- If they mention breaking up, update relationship status
- If they mention a new job/school, update that
- Don't extract temporary states (feeling tired today)
- Do extract persistent traits (I'm always anxious before presentations)

Return JSON array of updates (or empty array if nothing new):
[
  {
    "action": "add" | "update" | "deactivate",
    "category": "biographical" | "preferences" | "relationships" | "goals" | "habits",
    "key": "descriptive key like 'girlfriend' or 'college'",
    "value": "the actual value",
    "context": "optional context like 'as of Dec 2024' or 'ended Dec 2024'"
  }
]

Return only valid JSON array.`;

    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Low temperature for factual extraction
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Knowledge extraction failed: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Parse JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const updates: PersonalFactUpdate[] = JSON.parse(jsonMatch[0]);
    const newFacts: PersonalFact[] = [];
    const now = new Date();

    for (const update of updates) {
      if (update.action === 'add') {
        newFacts.push({
          id: uuid(),
          category: update.category,
          key: update.key,
          value: update.value,
          context: update.context,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
      } else if (update.action === 'update') {
        // Find and deactivate old fact, create new one
        const oldFact = existingFacts.find(
          (f) => f.category === update.category && f.key === update.key && f.isActive
        );
        if (oldFact) {
          oldFact.isActive = false;
          oldFact.updatedAt = now;
        }
        newFacts.push({
          id: uuid(),
          category: update.category,
          key: update.key,
          value: update.value,
          context: update.context,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
      } else if (update.action === 'deactivate') {
        const oldFact = existingFacts.find(
          (f) => f.category === update.category && f.key === update.key && f.isActive
        );
        if (oldFact) {
          oldFact.isActive = false;
          oldFact.updatedAt = now;
          oldFact.context = update.context || `ended ${now.toLocaleDateString()}`;
        }
      }
    }

    return newFacts;
  } catch (error) {
    console.error('Personal knowledge extraction error:', error);
    return [];
  }
}

// =============================================================================
// Semantic Memory Search (Layer 4: Vector Embeddings)
// =============================================================================

async function generateEmbedding(text: string): Promise<number[] | undefined> {
  if (!GEMINI_API_KEY || !text) {
    return undefined;
  }

  try {
    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const result = await response.json();
    return result.embedding?.values;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return undefined;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  const vecA = new Float32Array(a);
  const vecB = new Float32Array(b);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Find relevant memories using semantic similarity
 */
export async function findRelevantMemories(
  currentContext: string,
  allMemories: MemoryNode[],
  limit: number = 3
): Promise<MemoryNode[]> {
  if (allMemories.length === 0) {
    return [];
  }

  // Filter memories that have embeddings
  const memoriesWithEmbeddings = allMemories.filter((m) => m.embedding && m.embedding.length > 0);

  if (memoriesWithEmbeddings.length === 0) {
    // Fallback to most recent if no embeddings
    return allMemories.slice(0, limit);
  }

  // Generate embedding for current context
  const contextEmbedding = await generateEmbedding(currentContext);

  if (!contextEmbedding) {
    // Fallback to recency if embedding fails
    return allMemories.slice(0, limit);
  }

  // Use min-heap for top-k selection (O(n log k) instead of O(n log n))
  const topK: { memory: MemoryNode; score: number }[] = [];

  for (const memory of memoriesWithEmbeddings) {
    const score = cosineSimilarity(contextEmbedding, memory.embedding!);

    if (topK.length < limit) {
      topK.push({ memory, score });
      // Maintain min-heap property (smallest score at index 0)
      topK.sort((a, b) => a.score - b.score);
    } else if (score > topK[0].score) {
      // Replace the smallest if current is larger
      topK[0] = { memory, score };
      topK.sort((a, b) => a.score - b.score);
    }
  }

  // Return in descending order (most relevant first)
  return topK.reverse().map((item) => item.memory);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to fetch with exponential backoff and 429 retry handling
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        const delay = initialDelay * Math.pow(2, i - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        const errorData = await response.clone().json().catch(() => ({}));
        let retryAfter = initialDelay;

        const retryInfo = (errorData.error?.details as any[] | undefined)?.find(
          (d) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );
        
        const retryDelay = retryInfo?.retryDelay as string | undefined;
        
        if (retryDelay) {
          const seconds = parseFloat(retryDelay.replace('s', ''));
          if (!isNaN(seconds)) {
            retryAfter = seconds * 1000 + 500;
          }
        }

        if (i < maxRetries) {
          console.warn(`⚠️ Gemini Rate Limit (429). Retrying in ${retryAfter}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue; 
        }
      }

      if (response.status >= 500 && i < maxRetries) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) continue;
      throw lastError;
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'How are you feeling about the day?';
  if (hour < 17) return "How's your day going?";
  if (hour < 21) return 'How was your day?';
  return "What's on your mind?";
}

function createEmptyMemory(sessionId: string): MemoryNode {
  return {
    id: uuid(),
    sessionId,
    createdAt: new Date(),
    summary: '',
    topics: [],
    emotions: [],
    events: [],
    peopleMentioned: [],
    thoughts: [],
    unresolvedQuestions: [],
  };
}

function formatConversationHistory(messages: Message[]): string {
  return messages
    .slice(-10) // Last 10 messages for context
    .map((msg) => `${msg.isUser ? 'USER' : 'ASSISTANT'}: ${msg.content}`)
    .join('\n');
}

function formatTranscriptForAnalysis(messages: Message[]): string {
  return messages
    .map((msg) => `${msg.isUser ? 'Me' : 'AI'}: ${msg.content}`)
    .join('\n');
}

function buildSystemPrompt(
  personalFacts: PersonalFact[],
  relevantMemories: MemoryNode[]
): string {
  let prompt = `You are a thoughtful friend helping someone journal through voice conversation.

YOUR PERSONALITY:
- Sound like a real friend, not a therapist or AI assistant
- Match their energy - casual if they're casual, reflective if they're reflective
- Use natural language: "That sounds rough", "What happened?", "Makes sense"
- NEVER use therapy-speak: "I hear that you're feeling...", "Thank you for sharing"

CONVERSATION STYLE:
- Listen more than you talk
- Acknowledge what they said before asking anything
- Ask ONE question at a time, max
- Sometimes just respond with understanding, no question needed
- Don't treat every statement as needing deep exploration

MEMORY INTEGRATION:
- Reference past context naturally, like a friend would
- "Didn't this happen before with that project?"
- "You felt this way a few weeks ago when..."
- Only bring up past stuff when genuinely relevant
- Sound like you remember, not like you're reading a database

WHAT TO PROBE VS SKIP:
Probe deeper on:
- Strong emotions (anxiety, excitement, frustration)
- Recurring themes they keep mentioning
- Decisions or dilemmas
- Relationship dynamics

Move on from:
- Small daily logistics mentioned in passing
- Topics they seem done with
- Things they clearly don't want to explore

RESPONSE LENGTH:
- Keep it SHORT - this is voice, not text
- 1-3 sentences typically
- Don't over-explain or over-question`;

  // Add personal knowledge base (Layer 2 - always in context)
  if (personalFacts.length > 0) {
    prompt += '\n\nWHAT YOU KNOW ABOUT THEM:';
    const factsByCategory: Record<string, PersonalFact[]> = {};
    for (const fact of personalFacts) {
      if (!factsByCategory[fact.category]) {
        factsByCategory[fact.category] = [];
      }
      factsByCategory[fact.category].push(fact);
    }
    for (const [category, facts] of Object.entries(factsByCategory)) {
      prompt += `\n${category.toUpperCase()}:`;
      for (const fact of facts) {
        prompt += `\n- ${fact.key}: ${fact.value}${fact.context ? ` (${fact.context})` : ''}`;
      }
    }
  }

  // Add relevant memories (Layer 3 - retrieved based on context)
  if (relevantMemories.length > 0) {
    prompt += '\n\nRELEVANT PAST CONVERSATIONS:';
    for (const memory of relevantMemories) {
      prompt += `\n- ${memory.summary}`;
      if (memory.emotions.length > 0) {
        prompt += ` (felt: ${memory.emotions.join(', ')})`;
      }
    }
  }

  prompt += '\n\nNow respond to their latest message:';

  return prompt;
}
