import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { v4 as uuid } from 'uuid';
import { JournalSession, Message, ConversationState, MemoryNode, MemoryVector, Prompt, ConversationContext, LiveSessionCallbacks } from '../types';
import * as database from '../services/database';
import * as audio from '../services/audio';
import * as ai from '../services/ai';
import { LiveSession } from '../services/live';
import { detectAndUpdatePatterns } from '../services/patterns';
import { evaluateTheories } from '../services/theories';
import { markPromptExplored, buildPromptSessionOpener } from '../services/prompts';
import { buildConversationContext } from '../services/personalization';
import { haptics } from '../services/haptics';

// When true, voice conversations run over one Live API WebSocket session
// instead of the 3-call STT -> LLM -> TTS REST pipeline. See
// docs/live-api-refactor.md.
const USE_LIVE_API = process.env.EXPO_PUBLIC_USE_LIVE_API === 'true';

// Standalone function to process session memory (can be called from processing screen)
export async function processSessionMemory(session: JournalSession): Promise<void> {
  // Layer 3: Synthesize memory node from session
  console.log('Synthesizing memory from session...');
  const memoryNode = await ai.synthesizeMemory(session);
  if (memoryNode.summary) {
    await database.saveMemoryNode(memoryNode);
    console.log('Memory saved:', memoryNode.summary.substring(0, 50) + '...');
  }

  // Layer 2: Extract and update personal knowledge
  console.log('Extracting personal knowledge...');
  await ai.updatePersonalKnowledge(session);

  // Layer 4: Create and save chunk/highlight embeddings
  console.log('Generating memory vectors (chunks/highlights)...');
  await database.deleteMemoryVectorsForSession(session.id);
  const vectors = await ai.generateMemoryVectors(session, memoryNode);
  await database.saveMemoryVectors(vectors);
  console.log(`Memory vectors saved: ${vectors.length}`);

  // Pattern Discovery: Detect and update patterns based on this session
  console.log('Detecting patterns...');
  await detectAndUpdatePatterns(session, memoryNode);
  console.log('Pattern detection complete');

  // Theory Evaluation: Update working theories based on patterns
  console.log('Evaluating theories...');
  await evaluateTheories(session, memoryNode);
  console.log('Theory evaluation complete');
}

export function useSession() {
  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const sessionStartTime = useRef<Date | null>(null);

  // Cache for memory retrieval (avoid re-fetching on every message)
  const allMemoriesRef = useRef<MemoryNode[]>([]);
  const allMemoryVectorsRef = useRef<MemoryVector[]>([]);

  // Live API session state (only used when USE_LIVE_API)
  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioChunksRef = useRef<string[]>([]);
  const inputTranscriptRef = useRef('');
  const outputTranscriptRef = useRef('');
  const currentUserMsgIdRef = useRef<string | null>(null);
  const currentAiMsgIdRef = useRef<string | null>(null);
  const turnKindRef = useRef<'greeting' | 'normal'>('normal');
  const greetingResolveRef = useRef<(() => void) | null>(null);

  // Builds the Live API callbacks for a session. Transcripts stream in
  // incrementally and are accumulated per turn; messages are written to the
  // database once a turn completes (with their final text).
  const buildLiveCallbacks = useCallback((sessionId: string): LiveSessionCallbacks => ({
    onReady: () => {
      console.log('Live session ready');
    },

    onInputTranscript: (chunk: string) => {
      inputTranscriptRef.current += chunk;
      const text = inputTranscriptRef.current;
      setConversationState('processing');
      setMessages((prev) => {
        const id = currentUserMsgIdRef.current;
        if (id) {
          return prev.map((m) => (m.id === id ? { ...m, content: text } : m));
        }
        const newId = uuid();
        currentUserMsgIdRef.current = newId;
        return [...prev, { id: newId, content: text, isUser: true, timestamp: new Date() }];
      });
    },

    onOutputTranscript: (chunk: string) => {
      // The greeting bubble keeps its known text; only later turns stream.
      if (turnKindRef.current === 'greeting') return;
      outputTranscriptRef.current += chunk;
      const text = outputTranscriptRef.current;
      setMessages((prev) => {
        const id = currentAiMsgIdRef.current;
        if (id) {
          return prev.map((m) => (m.id === id ? { ...m, content: text } : m));
        }
        const newId = uuid();
        currentAiMsgIdRef.current = newId;
        return [...prev, { id: newId, content: text, isUser: false, timestamp: new Date() }];
      });
    },

    onAudioChunk: (base64Pcm: string) => {
      audioChunksRef.current.push(base64Pcm);
    },

    onTurnComplete: async () => {
      const kind = turnKindRef.current;
      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];

      // Persist the completed turn's messages with their final transcripts.
      if (kind === 'normal') {
        const userText = inputTranscriptRef.current.trim();
        const aiText = outputTranscriptRef.current.trim();
        if (userText && currentUserMsgIdRef.current) {
          await database.addMessage(sessionId, {
            id: currentUserMsgIdRef.current,
            content: userText,
            isUser: true,
            timestamp: new Date(),
          });
        }
        if (aiText && currentAiMsgIdRef.current) {
          await database.addMessage(sessionId, {
            id: currentAiMsgIdRef.current,
            content: aiText,
            isUser: false,
            timestamp: new Date(),
          });
        }
      }

      if (chunks.length > 0) {
        setConversationState('responding');
        haptics.aiResponse();
        try {
          await audio.playPcmChunks(chunks);
        } catch (error) {
          console.warn('Failed to play Live response audio:', error);
        }
      }

      inputTranscriptRef.current = '';
      outputTranscriptRef.current = '';
      currentUserMsgIdRef.current = null;
      currentAiMsgIdRef.current = null;
      setConversationState('idle');

      if (kind === 'greeting') {
        turnKindRef.current = 'normal';
        const resolve = greetingResolveRef.current;
        greetingResolveRef.current = null;
        resolve?.();
      }
    },

    onInterrupted: () => {
      audioChunksRef.current = [];
    },

    onError: (error: Error) => {
      console.error('Live session error:', error);
      // Don't strand startSession if the greeting turn fails.
      const resolve = greetingResolveRef.current;
      if (resolve) {
        greetingResolveRef.current = null;
        resolve();
      }
      setConversationState('idle');
    },

    onClose: (reason: string) => {
      console.log('Live session closed:', reason);
    },
  }), []);

  // Start a new session (optionally from a prompt)
  const startSession = useCallback(async (promptId?: string) => {
    // Load prompt if provided
    let prompt: Prompt | null = null;
    if (promptId) {
      prompt = await database.getPrompt(promptId);
    }

    const session: JournalSession = {
      id: uuid(),
      startedAt: new Date(),
      transcript: '',
      duration: 0,
      wordCount: 0,
      messages: [],
      sourcePromptId: promptId,
    };

    sessionStartTime.current = new Date();
    setCurrentSession(session);
    setMessages([]);

    // Initialize AI service
    await ai.initializeAI();

    // Pre-load all memories for semantic search during conversation
    try {
      const allSessions = await database.getAllSessions();
      const memories: MemoryNode[] = [];
      const vectors: MemoryVector[] = [];
      for (const s of allSessions) {
        const memory = await database.getMemoryNodeForSession(s.id);
        if (memory && memory.summary) {
          memories.push(memory);
        }
        const sessionVectors = await database.getMemoryVectorsForSession(s.id);
        vectors.push(...sessionVectors);
      }
      allMemoriesRef.current = memories;
      allMemoryVectorsRef.current = vectors;
    } catch (error) {
      console.warn('Failed to load memories:', error);
      allMemoriesRef.current = [];
      allMemoryVectorsRef.current = [];
    }

    // Save session to database
    await database.createSession(session);

    // Get opening message - use prompt opener if from prompt, otherwise default greeting
    const greeting = prompt ? buildPromptSessionOpener(prompt) : ai.getGreeting();

    // Greeting bubble shows immediately; spoken audio follows.
    const aiMessage: Message = {
      id: uuid(),
      content: greeting,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([aiMessage]);
    await database.addMessage(session.id, aiMessage);
    haptics.success();

    // --- Live API path: open one streaming session for the conversation ---
    let liveActive = false;
    if (USE_LIVE_API) {
      try {
        // Build the full memory context once; the Live session reuses it as
        // a system instruction for every turn (no per-turn re-send).
        const personalKnowledge = await database.getPersonalKnowledge();
        const relevantMemories = await ai.findRelevantMemories(
          greeting,
          allMemoriesRef.current,
          20
        );
        const relevantMemoryVectors = await ai.findRelevantMemoryVectors(
          greeting,
          allMemoryVectorsRef.current,
          30
        );
        let conversationContext: ConversationContext | undefined;
        try {
          conversationContext = await buildConversationContext(greeting, allMemoriesRef.current);
        } catch (error) {
          console.warn('Failed to build conversation context:', error);
        }
        const systemPrompt = ai.buildSystemPrompt(
          personalKnowledge,
          relevantMemories,
          relevantMemoryVectors,
          conversationContext,
          { mode: 'live', greeting }
        );

        const liveSession = new LiveSession();
        liveSessionRef.current = liveSession;
        await liveSession.connect(systemPrompt, buildLiveCallbacks(session.id));
        liveActive = true;

        // Trigger the model's spoken greeting and wait for it to finish so
        // recording doesn't start until the greeting is done.
        turnKindRef.current = 'greeting';
        setConversationState('responding');
        await new Promise<void>((resolve) => {
          greetingResolveRef.current = resolve;
          liveSession.sendTextTurn('[The session has started. Greet the user now.]');
          setTimeout(() => {
            if (greetingResolveRef.current) {
              greetingResolveRef.current = null;
              resolve();
            }
          }, 20000);
        });
        setConversationState('idle');
      } catch (error) {
        console.warn('Live API session failed, falling back to REST voice:', error);
        liveSessionRef.current = null;
        liveActive = false;
      }
    }

    // --- REST fallback path (also used when USE_LIVE_API is false) ---
    if (!liveActive) {
      try {
        const audioUri = await ai.synthesizeSpeech(greeting);
        if (audioUri) {
          console.log('Playing greeting audio...');
          await audio.playAudio(audioUri);
          console.log('Greeting audio finished, ready for recording');
        }
      } catch (error) {
        console.warn('Failed to play greeting audio:', error);
      }
    }

    return session;
  }, [buildLiveCallbacks]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!currentSession) return false;

    const started = await audio.startRecording((level) => {
      setAudioLevel(level);
    });
    if (started) {
      setIsRecording(true);
      setConversationState('listening');
      haptics.recordingStarted();
    }
    return started;
  }, [currentSession]);

  // Stop recording and process
  const stopRecording = useCallback(async () => {
    if (!currentSession || !isRecording) return;

    const result = await audio.stopRecording();
    setIsRecording(false);
    haptics.recordingStopped();

    if (!result) {
      setConversationState('idle');
      return;
    }

    // --- Live API path: send the recorded PCM as one turn ---
    if (USE_LIVE_API && liveSessionRef.current?.isConnected) {
      setConversationState('transcribing');
      inputTranscriptRef.current = '';
      outputTranscriptRef.current = '';
      currentUserMsgIdRef.current = null;
      currentAiMsgIdRef.current = null;
      audioChunksRef.current = [];
      turnKindRef.current = 'normal';
      try {
        const pcm = await audio.getRecordingPcmBase64(result.uri);
        liveSessionRef.current.sendAudioTurn(pcm);
      } catch (error) {
        console.error('Failed to send Live audio turn:', error);
        Alert.alert(
          'Something went wrong',
          'There was a problem sending your message. Please try again.',
          [{ text: 'OK' }]
        );
        setConversationState('idle');
      }
      return;
    }

    // --- REST fallback path ---
    if (result) {
      try {
        // Show transcribing state while processing audio
        setConversationState('transcribing');

        // Transcribe audio
        const transcription = await ai.transcribeAudio(result.uri);

        if (transcription.confidence === 0) {
          // Transcription failed — notify user and reset
          Alert.alert(
            'Couldn\'t hear that',
            transcription.text || 'There was a problem transcribing your audio. Check your internet connection and try again.',
            [{ text: 'OK' }]
          );
          setConversationState('idle');
          return;
        }

        // Add user message
        const userMessage: Message = {
          id: uuid(),
          content: transcription.text,
          isUser: true,
          timestamp: new Date(),
          audioUri: result.uri,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        await database.addMessage(currentSession.id, userMessage);

        // Now show processing state (after user message is visible)
        setConversationState('processing');

        // Generate AI response with full memory context
        setConversationState('responding');
        console.log('🎯 Starting AI response generation...');

        // Layer 2: Personal Knowledge Base (ALWAYS loaded)
        const personalKnowledge = await database.getPersonalKnowledge();
        console.log(`📚 Loaded personal knowledge (${personalKnowledge.length} chars)`);

        // Layer 3 & 4: Find relevant past memories using semantic search
        // Use the user's latest message as context for retrieval
        console.log('🔍 Finding relevant memories...');
        const relevantMemories = await ai.findRelevantMemories(
          transcription.text,
          allMemoriesRef.current,
          20 // Top 20 most relevant memories
        );
        console.log(`💭 Found ${relevantMemories.length} relevant memories`);

        // Retrieve granular memory vectors (chunks/highlights)
        const relevantMemoryVectors = await ai.findRelevantMemoryVectors(
          transcription.text,
          allMemoryVectorsRef.current,
          30
        );
        console.log(`🧩 Found ${relevantMemoryVectors.length} memory snippets`);

        // Build personalized conversation context (patterns, emotional baseline, topic history)
        console.log('🎭 Building personalized context...');
        let conversationContext: ConversationContext | undefined;
        try {
          conversationContext = await buildConversationContext(
            transcription.text,
            allMemoriesRef.current
          );
          console.log(`✨ Built personalized context: ${conversationContext.relevantPatterns.length} patterns, ${conversationContext.topicHistories.length} topic histories`);
        } catch (error) {
          console.warn('Failed to build conversation context:', error);
          // Continue without personalization context - not critical
        }

        // Generate response with full context
        console.log('⚙️ Generating AI response...');
        const response = await ai.generateResponse(
          updatedMessages,
          personalKnowledge,
          relevantMemories,
          relevantMemoryVectors,
          conversationContext
        );
        console.log('✅ AI response received:', response.text.substring(0, 50));

        // Add AI response
        const aiMessage: Message = {
          id: uuid(),
          content: response.text,
          isUser: false,
          timestamp: new Date(),
          audioUri: response.audioUri,
        };

        console.log('💾 Adding AI message to state and database...');
        setMessages((prev) => [...prev, aiMessage]);
        await database.addMessage(currentSession.id, aiMessage);
        console.log('✅ AI message saved');

        haptics.aiResponse();

        // Play AI response audio
        if (response.audioUri) {
          console.log('🔊 Playing AI response audio...');
          await audio.playAudio(response.audioUri);
          console.log('✅ AI response audio finished');
        }
      } catch (error) {
        console.error('Conversation error:', error);
        Alert.alert(
          'Something went wrong',
          'There was a problem processing your message. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }

    setConversationState('idle');
  }, [currentSession, isRecording, messages]);

  // Prepare session for ending (fast - just saves basic data)
  // Returns the session ID for use in processing
  const prepareEndSession = useCallback(async (): Promise<string | null> => {
    if (!currentSession || isEnding) return null;

    setIsEnding(true);

    // Close the Live API session (if any) before persisting.
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }

    const endedAt = new Date();
    const duration = sessionStartTime.current
      ? (endedAt.getTime() - sessionStartTime.current.getTime()) / 1000
      : 0;

    // Calculate transcript and word count from user messages only
    const transcript = messages
      .filter((m) => m.isUser)
      .map((m) => m.content)
      .join('\n\n');
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    const updatedSession: JournalSession = {
      ...currentSession,
      endedAt,
      duration,
      transcript,
      wordCount,
      messages,
    };

    // Save final session state
    await database.updateSession(updatedSession);

    // Mark prompt as explored if this session was started from a prompt
    if (currentSession.sourcePromptId) {
      try {
        await markPromptExplored(currentSession.sourcePromptId, updatedSession.id);
        console.log('Marked prompt as explored:', currentSession.sourcePromptId);
      } catch (error) {
        console.warn('Failed to mark prompt as explored:', error);
      }
    }

    // Store session ID for processing screen
    const sessionId = updatedSession.id;

    haptics.sessionEnded();

    // Reset state
    setCurrentSession(null);
    setMessages([]);
    setConversationState('idle');
    sessionStartTime.current = null;
    allMemoriesRef.current = [];
    allMemoryVectorsRef.current = [];
    audioChunksRef.current = [];
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
    currentUserMsgIdRef.current = null;
    currentAiMsgIdRef.current = null;
    greetingResolveRef.current = null;
    turnKindRef.current = 'normal';

    return sessionId;
  }, [currentSession, messages, isEnding]);

  // Legacy endSession for backwards compatibility (does everything)
  const endSession = useCallback(async () => {
    const sessionId = await prepareEndSession();
    if (!sessionId) return null;

    // Get the session back from database
    const session = await database.getSession(sessionId);
    if (!session) return null;

    // Process memory (this is the slow part)
    await processSessionMemory(session);

    return session;
  }, [prepareEndSession]);

  // Pause/resume
  const pauseRecording = useCallback(async () => {
    if (isRecording) {
      await audio.pauseRecording();
      setConversationState('paused');
    }
  }, [isRecording]);

  const resumeRecording = useCallback(async () => {
    if (currentSession && conversationState === 'paused') {
      await audio.resumeRecording();
      setConversationState('listening');
    }
  }, [currentSession, conversationState]);

  return {
    currentSession,
    conversationState,
    isRecording,
    isEnding,
    messages,
    audioLevel,
    startSession,
    startRecording,
    stopRecording,
    endSession,
    prepareEndSession,
    pauseRecording,
    resumeRecording,
  };
}
