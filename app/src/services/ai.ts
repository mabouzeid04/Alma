/**
 * AI Service - Second Brain Memory System
 *
 * Implements the four-layer memory architecture:
 * 1. Raw Transcripts (stored in database)
 * 2. Personal Knowledge Base (persistent facts, always in context)
 * 3. Session Memory Nodes (structured summaries per session)
 * 4. Vector Embeddings (semantic search)
 *
 * Uses Gemini for voice (STT/TTS) and supports Gemini, Grok, and GPT for conversation.
 */

import { Message, MemoryNode, MemoryVector, JournalSession, ConversationContext } from '../types';
import { v4 as uuid } from 'uuid';
import { fetchWithRetry, createTimeoutController } from './api-utils';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

// =============================================================================
// Configuration
// =============================================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_STT_MODEL = 'gemini-2.0-flash';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_TTS_VOICE = process.env.EXPO_PUBLIC_GEMINI_TTS_VOICE || 'Kore';
const OPENAI_API_URL = 'https://api.openai.com/v1';
const XAI_API_URL = 'https://api.x.ai/v1';

const DEFAULT_MODELS = {
  gemini: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview',
  openai: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-5-mini',
  xai: process.env.EXPO_PUBLIC_XAI_MODEL || 'grok-4-1-fast-non-reasoning',
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
  geminiApiKey?: string;
  openAiApiKey?: string;
  xaiApiKey?: string;
  preferredModel?: Partial<ModelPreference>;
  ttsVoice?: string;
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

// =============================================================================
// State
// =============================================================================

let isInitialized = false;
let activeTtsVoice = GEMINI_TTS_VOICE;
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
  if (config?.ttsVoice) {
    activeTtsVoice = config.ttsVoice;
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

  const hasGemini = !!(config?.geminiApiKey || GEMINI_API_KEY);
  const hasOpenAi = !!(config?.openAiApiKey || OPENAI_API_KEY);
  const hasXai = !!(config?.xaiApiKey || XAI_API_KEY);

  if (!hasGemini) {
    console.warn('⚠️ Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY (required for STT, TTS, and conversation)');
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
// Speech-to-Text (Gemini Multimodal)
// =============================================================================

export async function transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
  if (!activeGeminiApiKey) {
    return { text: '[No API key - transcription unavailable]', confidence: 0 };
  }

  try {
    console.log('🎙️ Starting transcription for:', audioUri);

    // Read audio file as base64 (native encoding — fast)
    const base64Audio = await readAsStringAsync(audioUri, { encoding: EncodingType.Base64 });
    console.log('📦 Audio file read, base64 length:', base64Audio.length);

    console.log('📤 Sending to Gemini for transcription...');

    const { controller, timeoutId } = createTimeoutController(45000);
    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: 'audio/mp4',
              data: base64Audio,
            },
          },
          {
            text: 'Transcribe this audio recording accurately. Return only the transcription text, nothing else. Do not add any commentary, labels, or formatting.',
          },
        ],
      }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 4000,
      },
    });

    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/${GEMINI_STT_MODEL}:generateContent?key=${activeGeminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        signal: controller.signal,
      },
      2,
      2000
    );

    clearTimeout(timeoutId);
    console.log('📡 Transcription response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Transcription error response:', errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('✅ Transcription result:', text?.substring(0, 50));

    return {
      text: text.trim(),
      confidence: 0.95,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return { text: '[Transcription failed]', confidence: 0 };
  }
}

// =============================================================================
// Text-to-Speech (Gemini TTS)
// =============================================================================

export async function synthesizeSpeech(text: string): Promise<string | null> {
  if (!activeGeminiApiKey) {
    console.log('⏭️ Skipping TTS - no API key');
    return null;
  }

  try {
    console.log('🎤 Starting TTS for text:', text.substring(0, 50));
    console.log('🔑 Using voice:', activeTtsVoice);

    const { controller, timeoutId } = createTimeoutController(45000);
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{ text }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: activeTtsVoice,
            },
          },
        },
      },
    });

    const response = await fetchWithRetry(
      `${GEMINI_API_URL}/models/${GEMINI_TTS_MODEL}:generateContent?key=${activeGeminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        signal: controller.signal,
      },
      2,
      2000
    );

    clearTimeout(timeoutId);
    console.log('📡 TTS response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ TTS failed with status:', response.status);
      console.error('❌ TTS error body:', errorBody);
      throw new Error(`TTS failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    const pcmBase64 = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!pcmBase64) {
      console.error('❌ No audio data in TTS response');
      return null;
    }

    // Convert PCM L16 (24kHz, mono) to WAV format
    console.log('🔄 Converting PCM to WAV...');
    const wavBase64 = pcmToWav(pcmBase64);
    console.log('✅ TTS complete, WAV audio size:', wavBase64.length);

    return `data:audio/wav;base64,${wavBase64}`;
  } catch (error) {
    console.error('❌ TTS error:', error);
    return null;
  }
}

/**
 * Converts raw PCM L16 audio (16-bit, 24kHz, mono) to WAV format
 * by prepending a standard 44-byte WAV header.
 */
function pcmToWav(pcmBase64: string): string {
  const pcmBinary = atob(pcmBase64);
  const pcmLength = pcmBinary.length;

  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmLength;
  const fileSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  wavWriteString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  wavWriteString(view, 8, 'WAVE');

  // fmt sub-chunk
  wavWriteString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  wavWriteString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Combine header + PCM data
  const wavBytes = new Uint8Array(44 + pcmLength);
  wavBytes.set(new Uint8Array(header), 0);
  for (let i = 0; i < pcmLength; i++) {
    wavBytes[i + 44] = pcmBinary.charCodeAt(i);
  }

  // Convert to base64 in chunks (avoids O(n²) string concat)
  const CHUNK = 8192;
  let wavBinaryStr = '';
  for (let i = 0; i < wavBytes.length; i += CHUNK) {
    wavBinaryStr += String.fromCharCode.apply(
      null,
      Array.from(wavBytes.subarray(i, Math.min(i + CHUNK, wavBytes.length)))
    );
  }
  return btoa(wavBinaryStr);
}

function wavWriteString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// =============================================================================
// Conversation Response (Multi-provider)
// =============================================================================

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
  const allMessages: ChatMessage[] = messages.map((msg) => ({
    role: msg.isUser ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  return [{ role: 'system' as const, content: systemPrompt }, ...allMessages];
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
  personalKnowledge: string,
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[] = [],
  conversationContext?: ConversationContext,
  modelOverride?: Partial<ModelPreference>
): Promise<AIResponse> {
  const modelPreference = resolveModelPreference(modelOverride);
  const systemPrompt = buildSystemPrompt(personalKnowledge, relevantMemories, relevantMemoryVectors, conversationContext);
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

    if (modelPreference.provider !== 'xai' && activeXaiApiKey) {
      try {
        const { controller, timeoutId } = createTimeoutController();
        try {
          const text = await generateWithXAI(
            chatMessages,
            DEFAULT_MODELS.xai,
            controller.signal
          );
          const audioUri = await synthesizeSpeech(text);
          return { text, audioUri: audioUri || undefined };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (fallbackError) {
        console.error('❌ Grok fallback failed:', fallbackError);
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
        maxTokens: 2000,
      });
    } catch (error) {
      console.error('Memory model failed, attempting Gemini fallback:', error);
      if (memoryModelPref.provider !== 'gemini' && activeGeminiApiKey) {
        text = await runPromptWithModel(
          prompt,
          { provider: 'gemini', model: DEFAULT_MODELS.gemini },
          controller.signal,
          { temperature: 0.2, maxTokens: 2000 }
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

function chunkTranscript(transcript: string, maxWords = 500, overlapWords = 50): string[] {
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
  }

  return vectors;
}

// =============================================================================
// Personal Knowledge Management (Layer 2: Persistent Facts with Smart Updates)
// =============================================================================

/**
 * Updates personal knowledge by intelligently merging new facts.
 * Uses LLM to identify which existing facts should be replaced vs added.
 * Each fact is timestamped with last-modified date.
 */
export async function updatePersonalKnowledge(session: JournalSession): Promise<void> {
  const hasAnyModelKey = !!(activeGeminiApiKey || activeOpenAiApiKey || activeXaiApiKey);
  if (!hasAnyModelKey || session.messages.length === 0) {
    return;
  }

  try {
    const transcript = formatTranscriptForAnalysis(session.messages);
    const currentKnowledge = await import('../services/database').then((m) => m.getPersonalKnowledge());
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Parse existing knowledge to show facts with line numbers for replacement
    const numberedFacts = numberExistingFacts(currentKnowledge);

    const prompt = `You are updating a personal knowledge base. Extract ONLY persistent facts from this journal entry.

CURRENT KNOWLEDGE (with line numbers for reference):
${numberedFacts || '(empty - no facts yet)'}

NEW JOURNAL ENTRY:
${transcript}

RULES:
1. ONLY extract PERSISTENT facts: job, relationships, family, location, goals, ongoing habits, core values
2. NEVER extract temporary states: "tired today", "went to a party", "had a meeting"
3. Be EXTREMELY conservative - only add facts explicitly stated
4. When something CHANGES (new job, breakup, moved cities), REPLACE the old fact
5. Write facts as COMPLETE, SPECIFIC sentences with context - avoid single words or vague statements

OUTPUT FORMAT - respond with ONLY these commands, one per line:

ADD [CATEGORY] fact text here
REPLACE [line_number] fact text here
DELETE [line_number]

Categories: BIOGRAPHICAL, RELATIONSHIPS, GOALS, PREFERENCES

EXAMPLES:
- User says "I started at Apple last month" and line 3 says "Works at Google" → REPLACE [3] Works at Apple as a software engineer (started January 2024)
- User says "My girlfriend is Sarah" with no prior relationship info → ADD [RELATIONSHIPS] Dating Sarah (girlfriend, met through mutual friends)
- User says "We broke up" and line 5 says "Dating Sarah" → REPLACE [5] Recently became single after ending 2-year relationship with Sarah
- User mentions going to a concert → (no output - temporary event)

IMPORTANT: Make facts detailed and specific. Instead of "Single" write "Recently became single after ending relationship with [name]". Instead of "Works at Apple" write "Works at Apple as [role] in [team/location]". Include relevant context when mentioned.

If there's NOTHING to update, respond with exactly: NO_CHANGES`;

    const knowledgeModelPref = resolveModelPreference({
      provider: KNOWLEDGE_MODEL_PROVIDER,
      model: KNOWLEDGE_MODEL,
    });

    const { controller, timeoutId } = createTimeoutController();
    let text: string;
    try {
      text = await runPromptWithModel(prompt, knowledgeModelPref, controller.signal, {
        temperature: 0.1,
        maxTokens: 1000,
      });
    } catch (error) {
      console.error('Knowledge model failed, attempting Gemini fallback:', error);
      if (knowledgeModelPref.provider !== 'gemini' && activeGeminiApiKey) {
        text = await runPromptWithModel(
          prompt,
          { provider: 'gemini', model: DEFAULT_MODELS.gemini },
          controller.signal,
          { temperature: 0.1, maxTokens: 1000 }
        );
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!text || text.trim() === 'NO_CHANGES' || text.includes('NO_CHANGES')) {
      console.log('📝 No knowledge updates');
      return;
    }

    // Parse and apply the commands
    const commands = parseKnowledgeCommands(text);
    if (commands.length === 0) {
      console.log('📝 No valid commands parsed');
      return;
    }

    const updatedKnowledge = applyKnowledgeCommands(currentKnowledge, commands, today);
    await import('../services/database').then((m) => m.savePersonalKnowledge(updatedKnowledge));
    console.log(`📝 Applied ${commands.length} knowledge update(s)`);
  } catch (error) {
    console.error('Personal knowledge extraction error:', error);
  }
}

interface ParsedFact {
  lineNumber: number;
  category: string;
  date: string;
  text: string;
}

/**
 * Parses existing knowledge and numbers each fact for LLM reference
 */
function numberExistingFacts(knowledge: string): string {
  if (!knowledge || !knowledge.trim()) return '';

  const lines = knowledge.split('\n');
  const output: string[] = [];
  let currentCategory = '';
  let factNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Category header
    const headerMatch = trimmed.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentCategory = headerMatch[1];
      output.push(`\n${trimmed}`);
      continue;
    }

    // Fact line with date prefix: [YYYY-MM-DD] fact text
    const factMatch = trimmed.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/);
    if (factMatch && currentCategory) {
      output.push(`  ${factNumber}. [${factMatch[1]}] ${factMatch[2]}`);
      factNumber++;
    } else if (currentCategory && trimmed) {
      // Legacy fact without date - show it numbered
      output.push(`  ${factNumber}. ${trimmed}`);
      factNumber++;
    }
  }

  return output.join('\n').trim();
}

/**
 * Parses all facts from knowledge into structured array
 */
function parseAllFacts(knowledge: string): ParsedFact[] {
  if (!knowledge || !knowledge.trim()) return [];

  const facts: ParsedFact[] = [];
  const lines = knowledge.split('\n');
  let currentCategory = '';
  let factNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentCategory = headerMatch[1];
      continue;
    }

    if (!currentCategory) continue;

    // Fact with date
    const factMatch = trimmed.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/);
    if (factMatch) {
      facts.push({
        lineNumber: factNumber,
        category: currentCategory,
        date: factMatch[1],
        text: factMatch[2],
      });
      factNumber++;
    } else if (trimmed) {
      // Legacy fact without date
      facts.push({
        lineNumber: factNumber,
        category: currentCategory,
        date: '',
        text: trimmed,
      });
      factNumber++;
    }
  }

  return facts;
}

type KnowledgeCommand =
  | { type: 'ADD'; category: string; fact: string }
  | { type: 'REPLACE'; lineNumber: number; fact: string }
  | { type: 'DELETE'; lineNumber: number };

/**
 * Parses LLM output into structured commands
 */
function parseKnowledgeCommands(text: string): KnowledgeCommand[] {
  const commands: KnowledgeCommand[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);

  for (const line of lines) {
    // ADD [CATEGORY] fact
    const addMatch = line.match(/^ADD\s+\[([A-Z\s&]+)\]\s+(.+)$/i);
    if (addMatch) {
      commands.push({
        type: 'ADD',
        category: addMatch[1].trim().toUpperCase(),
        fact: addMatch[2].trim(),
      });
      continue;
    }

    // REPLACE [number] fact
    const replaceMatch = line.match(/^REPLACE\s+\[(\d+)\]\s+(.+)$/i);
    if (replaceMatch) {
      commands.push({
        type: 'REPLACE',
        lineNumber: parseInt(replaceMatch[1], 10),
        fact: replaceMatch[2].trim(),
      });
      continue;
    }

    // DELETE [number]
    const deleteMatch = line.match(/^DELETE\s+\[(\d+)\]$/i);
    if (deleteMatch) {
      commands.push({
        type: 'DELETE',
        lineNumber: parseInt(deleteMatch[1], 10),
      });
    }
  }

  return commands;
}

/**
 * Applies commands to existing knowledge and rebuilds markdown
 */
function applyKnowledgeCommands(
  currentKnowledge: string,
  commands: KnowledgeCommand[],
  today: string
): string {
  // Parse existing facts
  const facts = parseAllFacts(currentKnowledge);

  // Build a map of lineNumber -> fact for quick updates
  const factMap = new Map<number, ParsedFact>();
  for (const fact of facts) {
    factMap.set(fact.lineNumber, fact);
  }

  // Track deletions
  const deletedLines = new Set<number>();

  // Apply commands
  for (const cmd of commands) {
    if (cmd.type === 'DELETE') {
      deletedLines.add(cmd.lineNumber);
    } else if (cmd.type === 'REPLACE') {
      const existing = factMap.get(cmd.lineNumber);
      if (existing) {
        existing.text = cmd.fact;
        existing.date = today;
      }
    } else if (cmd.type === 'ADD') {
      // Add new fact with next line number
      const maxLine = Math.max(0, ...Array.from(factMap.keys()));
      facts.push({
        lineNumber: maxLine + 1,
        category: cmd.category,
        date: today,
        text: cmd.fact,
      });
      factMap.set(maxLine + 1, facts[facts.length - 1]);
    }
  }

  // Filter out deleted facts
  const remainingFacts = facts.filter((f) => !deletedLines.has(f.lineNumber));

  // Group by category
  const byCategory: Record<string, ParsedFact[]> = {};
  for (const fact of remainingFacts) {
    if (!byCategory[fact.category]) {
      byCategory[fact.category] = [];
    }
    byCategory[fact.category].push(fact);
  }

  // Rebuild markdown with ordered categories
  const orderedCategories = [
    'BIOGRAPHICAL',
    'RELATIONSHIPS',
    'GOALS',
    'PREFERENCES',
    'WELLNESS',
    'CHALLENGES',
    'VALUES',
  ];

  const markdown: string[] = [];

  // Add ordered categories first
  for (const category of orderedCategories) {
    const categoryFacts = byCategory[category];
    if (categoryFacts && categoryFacts.length > 0) {
      markdown.push(`## ${category}`);
      for (const fact of categoryFacts) {
        const datePrefix = fact.date ? `[${fact.date}]` : `[${today}]`;
        markdown.push(`${datePrefix} ${fact.text}`);
      }
      markdown.push('');
      delete byCategory[category];
    }
  }

  // Add any remaining categories
  for (const [category, categoryFacts] of Object.entries(byCategory)) {
    if (categoryFacts.length > 0) {
      markdown.push(`## ${category}`);
      for (const fact of categoryFacts) {
        const datePrefix = fact.date ? `[${fact.date}]` : `[${today}]`;
        markdown.push(`${datePrefix} ${fact.text}`);
      }
      markdown.push('');
    }
  }

  return markdown.join('\n').trim();
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
  limit: number = 20
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
  limit: number = 30
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
    .map((msg) => `${msg.isUser ? 'USER' : 'ASSISTANT'}: ${msg.content}`)
    .join('\n');
}

function formatTranscriptForAnalysis(messages: Message[]): string {
  return messages
    .map((msg) => `${msg.isUser ? 'Me' : 'Alma'}: ${msg.content}`)
    .join('\n');
}

function buildSystemPrompt(
  personalKnowledge: string,
  relevantMemories: MemoryNode[],
  relevantMemoryVectors: MemoryVector[],
  conversationContext?: ConversationContext
): string {
  let prompt = `Your name is Alma. You are a thoughtful friend helping someone journal through voice conversation.

YOUR PERSONALITY:
- Sound like a real friend, not a therapist or generic AI assistant
- Match their energy - casual if they're casual, reflective if they're reflective
- Use natural language: "That sounds rough", "What happened?", "Makes sense"
- NEVER use therapy-speak: "I hear that you're feeling...", "Thank you for sharing"

CONVERSATION STYLE:
- Listen more than you talk
- Ask ONE question at a time, max
- Sometimes just respond with understanding, no question needed
- Don't treat every statement as needing deep exploration

MEMORY INTEGRATION:
- Reference past context naturally, like a friend would
- Use natural timeframes: "a few weeks ago", "last month", "a while back"
- Include emotional context: "Last time you talked about this, you seemed really stressed"
- Connect to patterns: "This feels similar to when you were dealing with [past situation]"
- Only bring up past stuff when genuinely relevant
- Sound like you remember, not like you're reading a database

WHAT TO PROBE VS SKIP:
- Use your name "Alma" if it feels natural in the context of being a friend, but don't overdo it.
- Probe deeper on:
- Strong emotions (anxiety, excitement, frustration)
- Recurring themes or unresolved questions they keep circling
- Decisions or dilemmas they're working through
- Relationship dynamics that seem significant
- When they mention something new for the first time (new person, new situation)

Move on from:
- Small daily logistics mentioned in passing
- Topics they seem done with or resolved
- Things they clearly don't want to explore

EMOTIONAL ATTUNEMENT:
- Notice when they seem different from their usual baseline
- "You sound more stressed than usual - what's going on?"
- "You seem really energized about this - that's great"
- If they're just venting, validate without interrogating

RESPONSE LENGTH:
- Keep it SHORT - this is voice, not text
- 1-3 sentences typically
- Don't over-explain or over-question`;

  // Add personal knowledge base (Layer 2 - always in context)
  if (personalKnowledge.trim()) {
    prompt += '\n\nWHAT YOU KNOW ABOUT THEM:\n' + personalKnowledge;
  }

  // Add personalized context (patterns, emotional baseline, topic history)
  if (conversationContext) {
    // Emotional baseline
    if (conversationContext.emotionalBaseline.dominantEmotions.length > 0) {
      prompt += '\n\nEMOTIONAL BASELINE:';
      prompt += `\n- Their typical emotions lately: ${conversationContext.emotionalBaseline.dominantEmotions.join(', ')}`;
      if (conversationContext.emotionalBaseline.trendNarrative) {
        prompt += `\n- ${conversationContext.emotionalBaseline.trendNarrative}`;
      }
      if (conversationContext.emotionalBaseline.deviationFromBaseline) {
        prompt += `\n- NOTE FOR THIS CONVERSATION: ${conversationContext.emotionalBaseline.deviationFromBaseline}`;
      }
    }

    // Relevant patterns for current topics
    if (conversationContext.relevantPatterns.length > 0) {
      prompt += '\n\nPATTERNS YOU\'VE NOTICED (use naturally if relevant):';
      for (const pattern of conversationContext.relevantPatterns.slice(0, 3)) {
        prompt += `\n- ${pattern.description}`;
        if (pattern.evidenceQuotes.length > 0) {
          prompt += `\n  (They said: "${pattern.evidenceQuotes[0]}")`;
        }
      }
    }

    // Topic histories with natural references
    if (conversationContext.topicHistories.length > 0) {
      prompt += '\n\nPAST CONVERSATIONS ABOUT THESE TOPICS:';
      for (const history of conversationContext.topicHistories.slice(0, 3)) {
        if (history.pastDiscussions.length > 0) {
          const ref = history.pastDiscussions[0];
          let entry = `\n- ${ref.timeframeNatural}, about ${history.topic}: "${ref.summary}"`;
          if (ref.emotionalContext) {
            entry += ` (they ${ref.emotionalContext})`;
          }
          prompt += entry;
        }
        if (history.opinionEvolution) {
          prompt += `\n  (Their feelings have evolved: ${history.opinionEvolution})`;
        }
      }
    }

    // Unresolved questions they keep circling
    if (conversationContext.unresolvedQuestions.length > 0) {
      prompt += '\n\nUNRESOLVED QUESTIONS THEY KEEP CIRCLING (gently probe if they bring these up):';
      for (const q of conversationContext.unresolvedQuestions.slice(0, 3)) {
        prompt += `\n- "${q.subject}": ${q.description}`;
      }
    }

    // Relationship patterns
    if (conversationContext.relationshipPatterns.length > 0) {
      prompt += '\n\nRELATIONSHIP DYNAMICS YOU\'VE NOTICED:';
      for (const rp of conversationContext.relationshipPatterns.slice(0, 3)) {
        prompt += `\n- ${rp.subject}: ${rp.description}`;
      }
    }

    // Probe opportunities (internal guidance)
    if (conversationContext.probeOpportunities.length > 0) {
      prompt += '\n\nOPPORTUNITIES TO PROBE DEEPER (only if it feels natural):';
      for (const opportunity of conversationContext.probeOpportunities) {
        prompt += `\n- ${opportunity}`;
      }
    }
  }

  // Add relevant memories (Layer 3 - retrieved based on context)
  if (relevantMemories.length > 0) {
    prompt += '\n\nRELEVANT PAST CONVERSATIONS (treat as context, reference naturally when relevant):';
    for (const memory of relevantMemories.slice(0, 10)) {
      prompt += `\n- ${memory.summary}`;
      if (memory.emotions.length > 0) {
        prompt += ` (felt: ${memory.emotions.join(', ')})`;
      }
    }
  }

  if (relevantMemoryVectors.length > 0) {
    prompt += '\n\nPAST DETAILS (treat as context, only reference if genuinely relevant):';
    for (const vector of relevantMemoryVectors.slice(0, 15)) {
      const text = vector.text.length > 300 ? `${vector.text.slice(0, 297)}...` : vector.text;
      prompt += `\n- ${text}`;
    }
  }

  prompt += '\n\nNow respond to their latest message:';

  return prompt;
}
