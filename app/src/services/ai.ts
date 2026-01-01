/**
 * AI Service - Second Brain Memory System
 *
 * Implements the four-layer memory architecture:
 * 1. Raw Transcripts (stored in database)
 * 2. Personal Knowledge Base (persistent facts, always in context)
 * 3. Session Memory Nodes (structured summaries per session)
 * 4. Vector Embeddings (semantic search)
 *
 * Uses ElevenLabs for voice (REST API) and supports Gemini, Grok, and GPT.
 */

import { Message, MemoryNode, MemoryVector, PersonalFact, JournalSession } from '../types';
import { v4 as uuid } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, friendly

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_API_URL = 'https://api.openai.com/v1';
const XAI_API_URL = 'https://api.x.ai/v1';

const DEFAULT_MODELS = {
  gemini: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview',
  openai: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-5-mini',
  xai: process.env.EXPO_PUBLIC_XAI_MODEL || 'grok-4.1-fast',
};

const MEMORY_MODEL_PROVIDER = process.env.EXPO_PUBLIC_MEMORY_MODEL_PROVIDER as ModelProvider | undefined;
const MEMORY_MODEL = process.env.EXPO_PUBLIC_MEMORY_MODEL;
const KNOWLEDGE_MODEL_PROVIDER = process.env.EXPO_PUBLIC_KNOWLEDGE_MODEL_PROVIDER as ModelProvider | undefined;
const KNOWLEDGE_MODEL = process.env.EXPO_PUBLIC_KNOWLEDGE_MODEL;
const EMBEDDING_MODEL_PROVIDER = process.env.EXPO_PUBLIC_EMBEDDING_MODEL_PROVIDER as ModelProvider | undefined;
const EMBEDDING_MODEL = process.env.EXPO_PUBLIC_EMBEDDING_MODEL;
const MEMORY_SIMILARITY_WEIGHT = 0.7;
const MEMORY_RECENCY_WEIGHT = 0.3;
const MEMORY_RECENCY_HALF_LIFE_DAYS = 60;

type ModelProvider = 'gemini' | 'openai' | 'xai';

interface ModelPreference {
  provider: ModelProvider;
  model: string;
}

// =============================================================================
// Types
// =============================================================================

export interface AIConfig {
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
  openAiApiKey?: string;
  xaiApiKey?: string;
  preferredModel?: Partial<ModelPreference>;
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

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

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
let activeGeminiApiKey = GEMINI_API_KEY;
let activeOpenAiApiKey = OPENAI_API_KEY;
let activeXaiApiKey = XAI_API_KEY;
let preferredModel: Partial<ModelPreference> = {
  provider: process.env.EXPO_PUBLIC_PRIMARY_MODEL_PROVIDER as ModelProvider | undefined,
  model: process.env.EXPO_PUBLIC_PRIMARY_MODEL || process.env.EXPO_PUBLIC_AI_MODEL,
};

// =============================================================================
// Initialization
// =============================================================================

export async function initializeAI(config?: AIConfig): Promise<void> {
  if (config?.voiceId) {
    activeVoiceId = config.voiceId;
  }

  if (config?.geminiApiKey) {
    activeGeminiApiKey = config.geminiApiKey;
  }

  if (config?.openAiApiKey) {
    activeOpenAiApiKey = config.openAiApiKey;
  }

  if (config?.xaiApiKey) {
    activeXaiApiKey = config.xaiApiKey;
  }

  if (config?.preferredModel) {
    preferredModel = { ...preferredModel, ...config.preferredModel };
  }

  const hasElevenLabs = !!(config?.elevenLabsApiKey || ELEVENLABS_API_KEY);
  const hasGemini = !!(config?.geminiApiKey || GEMINI_API_KEY);
  const hasOpenAi = !!(config?.openAiApiKey || OPENAI_API_KEY);
  const hasXai = !!(config?.xaiApiKey || XAI_API_KEY);

  if (!hasElevenLabs || !hasGemini) {
    console.warn('⚠️ Missing API keys. Set EXPO_PUBLIC_ELEVENLABS_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY');
  }

  if (!hasOpenAi) {
    console.warn('ℹ️ OpenAI key missing. Set EXPO_PUBLIC_OPENAI_API_KEY to enable GPT models.');
  }

  if (!hasXai) {
    console.warn('ℹ️ xAI key missing. Set EXPO_PUBLIC_XAI_API_KEY to enable Grok models.');
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
// Conversation Response (Multi-provider)
// =============================================================================

function createTimeoutController(timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

function inferProviderFromModelName(model?: string): ModelProvider {
  const normalized = (model || '').toLowerCase();
  if (normalized.includes('grok') || normalized.includes('xai')) return 'xai';
  if (normalized.includes('gpt') || normalized.includes('openai') || normalized.includes('o1') || normalized.includes('5'))
    return 'openai';
  return 'gemini';
}

function resolveModelPreference(overrides?: Partial<ModelPreference>): ModelPreference {
  const merged: Partial<ModelPreference> = {
    ...preferredModel,
    ...overrides,
  };

  const provider = merged.provider || inferProviderFromModelName(merged.model);
  const model =
    merged.model ||
    (provider === 'openai'
      ? DEFAULT_MODELS.openai
      : provider === 'xai'
      ? DEFAULT_MODELS.xai
      : DEFAULT_MODELS.gemini);

  const resolvedProvider = provider || inferProviderFromModelName(model);

  return {
    provider: resolvedProvider,
    model,
  };
}

function buildChatMessages(systemPrompt: string, messages: Message[]): ChatMessage[] {
  const recentMessages: ChatMessage[] = messages.slice(-10).map((msg) => ({
    role: msg.isUser ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  return [{ role: 'system' as const, content: systemPrompt }, ...recentMessages];
}

async function runPromptWithModel(
  prompt: string,
  modelPref: ModelPreference,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number; topP?: number }
): Promise<string> {
  const chatMessages: ChatMessage[] = [
    { role: 'system', content: 'You are a careful, structured analyst. Return only the requested output.' },
    { role: 'user', content: prompt },
  ];

  if (modelPref.provider === 'openai') {
    return generateWithOpenAI(chatMessages, modelPref.model, signal, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  }

  if (modelPref.provider === 'xai') {
    return generateWithXAI(chatMessages, modelPref.model, signal, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  }

  // Gemini path uses existing function; systemPrompt is unused here so pass empty
  return generateWithGemini('', prompt, modelPref.model, signal, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    topP: options?.topP,
  });
}

async function generateWithGemini(
  systemPrompt: string,
  conversationHistory: string,
  modelId: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number; topP?: number }
): Promise<string> {
  if (!activeGeminiApiKey) {
    throw new Error('No Gemini API key found');
  }

  const response = await fetchWithRetry(
    `${GEMINI_API_URL}/models/${modelId}:generateContent?key=${activeGeminiApiKey}`,
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
          temperature: options?.temperature ?? 0.8,
          maxOutputTokens: options?.maxTokens ?? 300,
          topP: options?.topP ?? 0.9,
        },
      }),
      signal,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "What's on your mind?";
}

async function generateWithOpenAI(
  chatMessages: ChatMessage[],
  model: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!activeOpenAiApiKey) {
    throw new Error('No OpenAI API key found');
  }

  const response = await fetchWithRetry(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeOpenAiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 300,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || "What's on your mind?";
}

async function generateWithXAI(
  chatMessages: ChatMessage[],
  model: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!activeXaiApiKey) {
    throw new Error('No xAI API key found');
  }

  const response = await fetchWithRetry(`${XAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeXaiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 300,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || "What's on your mind?";
}

export async function generateResponse(
  messages: Message[],
  personalFacts: PersonalFact[],
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[] = [],
  modelOverride?: Partial<ModelPreference>
): Promise<AIResponse> {
  const modelPreference = resolveModelPreference(modelOverride);
  const systemPrompt = buildSystemPrompt(personalFacts, relevantMemories, relevantMemoryVectors);
  const conversationHistory = formatConversationHistory(messages);
  const chatMessages = buildChatMessages(systemPrompt, messages);

  const runWithPreferredProvider = async (): Promise<AIResponse> => {
    if (modelPreference.provider === 'openai' && activeOpenAiApiKey) {
      const { controller, timeoutId } = createTimeoutController();
      try {
        const text = await generateWithOpenAI(chatMessages, modelPreference.model, controller.signal);
        const audioUri = await synthesizeSpeech(text);
        return { text, audioUri: audioUri || undefined };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (modelPreference.provider === 'xai' && activeXaiApiKey) {
      const { controller, timeoutId } = createTimeoutController();
      try {
        const text = await generateWithXAI(chatMessages, modelPreference.model, controller.signal);
        const audioUri = await synthesizeSpeech(text);
        return { text, audioUri: audioUri || undefined };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const { controller, timeoutId } = createTimeoutController();
    try {
      const text = await generateWithGemini(
        systemPrompt,
        conversationHistory,
        modelPreference.provider === 'gemini' ? modelPreference.model : DEFAULT_MODELS.gemini,
        controller.signal
      );
      const audioUri = await synthesizeSpeech(text);
      return { text, audioUri: audioUri || undefined };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await runWithPreferredProvider();
  } catch (error) {
    console.error('❌ Response generation error:', error);

    if (modelPreference.provider !== 'gemini' && activeGeminiApiKey) {
      try {
        const { controller, timeoutId } = createTimeoutController();
        try {
          const text = await generateWithGemini(
            systemPrompt,
            conversationHistory,
            DEFAULT_MODELS.gemini,
            controller.signal
          );
          const audioUri = await synthesizeSpeech(text);
          return { text, audioUri: audioUri || undefined };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (fallbackError) {
        console.error('❌ Gemini fallback failed:', fallbackError);
      }
    }

    return { text: "I'm here. What would you like to talk about?" };
  }
}

// =============================================================================
// Memory Synthesis (Layer 3: Session Memory Nodes)
// =============================================================================

export async function synthesizeMemory(session: JournalSession): Promise<MemoryNode> {
  const hasAnyModelKey = !!(activeGeminiApiKey || activeOpenAiApiKey || activeXaiApiKey);
  if (!hasAnyModelKey || session.messages.length === 0) {
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

    const memoryModelPref = resolveModelPreference({
      provider: MEMORY_MODEL_PROVIDER,
      model: MEMORY_MODEL,
    });

    const { controller, timeoutId } = createTimeoutController();
    let text: string;
    try {
      text = await runPromptWithModel(prompt, memoryModelPref, controller.signal, {
        temperature: 0.2,
        maxTokens: 800,
      });
    } catch (error) {
      console.error('Memory model failed, attempting Gemini fallback:', error);
      if (memoryModelPref.provider !== 'gemini' && activeGeminiApiKey) {
        text = await runPromptWithModel(
          prompt,
          { provider: 'gemini', model: DEFAULT_MODELS.gemini },
          controller.signal,
          { temperature: 0.2, maxTokens: 800 }
        );
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }

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

function chunkTranscript(transcript: string, maxWords = 350, overlapWords = 50): string[] {
  if (!transcript.trim()) return [];
  const words = transcript.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const slice = words.slice(start, end).join(' ');
    chunks.push(slice);
    if (end === words.length) break;
    start = Math.max(end - overlapWords, start + 1);
  }
  return chunks;
}

function buildHighlightSnippets(memory: MemoryNode, maxItems = 5): string[] {
  const snippets: string[] = [];
  if (memory.summary) snippets.push(`Summary: ${memory.summary}`);
  for (const event of memory.events || []) {
    snippets.push(`Event: ${event}`);
  }
  for (const thought of memory.thoughts || []) {
    snippets.push(`Insight: ${thought}`);
  }
  for (const person of memory.peopleMentioned || []) {
    snippets.push(`Person: ${person}`);
  }
  for (const topic of memory.topics || []) {
    snippets.push(`Topic: ${topic}`);
  }
  for (const emotion of memory.emotions || []) {
    snippets.push(`Emotion: ${emotion}`);
  }
  for (const question of memory.unresolvedQuestions || []) {
    snippets.push(`Open: ${question}`);
  }

  // Deduplicate and cap
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of snippets) {
    if (!seen.has(item)) {
      seen.add(item);
      unique.push(item);
    }
    if (unique.length >= maxItems) break;
  }
  return unique;
}

export async function generateMemoryVectors(
  session: JournalSession,
  memory: MemoryNode
): Promise<MemoryVector[]> {
  const vectors: MemoryVector[] = [];
  const timestamp = memory.createdAt || new Date();

  // Chunk embeddings from transcript
  const chunks = chunkTranscript(session.transcript);
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    if (!embedding) continue;
    vectors.push({
      id: uuid(),
      sessionId: session.id,
      type: 'chunk',
      text: chunk,
      embedding,
      createdAt: timestamp,
    });
    if (vectors.length >= 15) break; // guardrail to prevent bloat
  }

  // Highlight embeddings derived from memory node
  const highlights = buildHighlightSnippets(memory);
  for (const highlight of highlights) {
    const embedding = await generateEmbedding(highlight);
    if (!embedding) continue;
    vectors.push({
      id: uuid(),
      sessionId: session.id,
      type: 'highlight',
      text: highlight,
      embedding,
      createdAt: timestamp,
    });
    if (vectors.length >= 20) break; // small overall cap
  }

  return vectors;
}

// =============================================================================
// Personal Knowledge Extraction (Layer 2: Personal Knowledge Base)
// =============================================================================

export async function updatePersonalKnowledge(
  session: JournalSession,
  existingFacts: PersonalFact[]
): Promise<PersonalFact[]> {
  const hasAnyModelKey = !!(activeGeminiApiKey || activeOpenAiApiKey || activeXaiApiKey);
  if (!hasAnyModelKey || session.messages.length === 0) {
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

    const knowledgeModelPref = resolveModelPreference({
      provider: KNOWLEDGE_MODEL_PROVIDER,
      model: KNOWLEDGE_MODEL,
    });

    const { controller, timeoutId } = createTimeoutController();
    let text: string;
    try {
      text = await runPromptWithModel(prompt, knowledgeModelPref, controller.signal, {
        temperature: 0.1,
        maxTokens: 500,
      });
    } catch (error) {
      console.error('Knowledge model failed, attempting Gemini fallback:', error);
      if (knowledgeModelPref.provider !== 'gemini' && activeGeminiApiKey) {
        text = await runPromptWithModel(
          prompt,
          { provider: 'gemini', model: DEFAULT_MODELS.gemini },
          controller.signal,
          { temperature: 0.1, maxTokens: 500 }
        );
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }

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

async function embedWithOpenAI(text: string, model: string, signal?: AbortSignal): Promise<number[] | undefined> {
  if (!activeOpenAiApiKey) {
    throw new Error('No OpenAI API key for embeddings');
  }

  const response = await fetchWithRetry(`${OPENAI_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeOpenAiApiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.[0]?.embedding;
}

async function embedWithGemini(text: string, model: string, signal?: AbortSignal): Promise<number[] | undefined> {
  if (!activeGeminiApiKey) {
    throw new Error('No Gemini API key for embeddings');
  }

  const response = await fetchWithRetry(
    `${GEMINI_API_URL}/models/${model}:embedContent?key=${activeGeminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini embedding error: ${response.status}`);
  }

  const result = await response.json();
  return result.embedding?.values;
}

function resolveEmbeddingPreference(): ModelPreference {
  const provider = EMBEDDING_MODEL_PROVIDER || 'gemini';
  const model =
    EMBEDDING_MODEL ||
    (provider === 'openai'
      ? 'text-embedding-3-small'
      : provider === 'xai'
      ? DEFAULT_MODELS.xai
      : 'text-embedding-004');

  return { provider, model };
}

async function generateEmbedding(text: string): Promise<number[] | undefined> {
  if (!text) {
    return undefined;
  }

  try {
    const embeddingPref = resolveEmbeddingPreference();
    if (embeddingPref.provider === 'openai') {
      return await embedWithOpenAI(text, embeddingPref.model);
    }

    if (embeddingPref.provider === 'xai') {
      console.warn('⚠️ xAI embeddings not supported; falling back to Gemini if available');
      if (activeGeminiApiKey) {
        return await embedWithGemini(text, 'text-embedding-004');
      }
      return undefined;
    }

    return await embedWithGemini(text, embeddingPref.model);
  } catch (error) {
    console.error('Embedding generation error:', error);

    if (EMBEDDING_MODEL_PROVIDER !== 'gemini' && activeGeminiApiKey) {
      try {
        return await embedWithGemini(text, 'text-embedding-004');
      } catch (fallbackError) {
        console.error('Gemini embedding fallback failed:', fallbackError);
      }
    }

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

function recencyWeight(createdAt: Date, halfLifeDays: number): number {
  if (halfLifeDays <= 0) {
    return 1;
  }
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / halfLifeDays);
}

/**
 * Find relevant memories using semantic similarity blended with recency
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

  // Choose pool: prefer embedded memories, otherwise use all
  const pool = memoriesWithEmbeddings.length > 0 ? memoriesWithEmbeddings : allMemories;

  // Generate embedding for current context if we have any embeddings to compare
  const contextEmbedding =
    memoriesWithEmbeddings.length > 0 ? await generateEmbedding(currentContext) : undefined;

  const scored = pool.map((memory) => {
    const similarity =
      contextEmbedding && memory.embedding ? cosineSimilarity(contextEmbedding, memory.embedding) : 0;
    const recency = recencyWeight(memory.createdAt, MEMORY_RECENCY_HALF_LIFE_DAYS);
    const blended = MEMORY_SIMILARITY_WEIGHT * similarity + MEMORY_RECENCY_WEIGHT * recency;
    return { memory, blended, similarity, recency };
  });

  // Sort by blended score, then by recency (newer first) for stability
  const sorted = scored.sort((a, b) => {
    if (b.blended !== a.blended) return b.blended - a.blended;
    return b.memory.createdAt.getTime() - a.memory.createdAt.getTime();
  });

  return sorted.slice(0, limit).map((item) => item.memory);
}

export async function findRelevantMemoryVectors(
  currentContext: string,
  vectors: MemoryVector[],
  limit: number = 5
): Promise<MemoryVector[]> {
  if (vectors.length === 0) {
    return [];
  }

  const contextEmbedding = await generateEmbedding(currentContext);
  if (!contextEmbedding) {
    // Fallback to recency only
    return vectors
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  const scored = vectors.map((vector) => {
    const similarity = vector.embedding ? cosineSimilarity(contextEmbedding, vector.embedding) : 0;
    const recency = recencyWeight(vector.createdAt, MEMORY_RECENCY_HALF_LIFE_DAYS);
    const blended = MEMORY_SIMILARITY_WEIGHT * similarity + MEMORY_RECENCY_WEIGHT * recency;
    return { vector, blended, similarity, recency };
  });

  const sorted = scored.sort((a, b) => {
    if (b.blended !== a.blended) return b.blended - a.blended;
    return b.vector.createdAt.getTime() - a.vector.createdAt.getTime();
  });

  return sorted.slice(0, limit).map((item) => item.vector);
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
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[]
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

  if (relevantMemoryVectors.length > 0) {
    prompt += '\n\nPAST DETAILS:';
    for (const vector of relevantMemoryVectors) {
      const text = vector.text.length > 220 ? `${vector.text.slice(0, 217)}...` : vector.text;
      prompt += `\n- ${text}`;
    }
  }

  prompt += '\n\nNow respond to their latest message:';

  return prompt;
}
