import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { JournalSession, Message, ConversationState, MemoryNode, MemoryVector } from '../types';
import * as database from '../services/database';
import * as audio from '../services/audio';
import * as ai from '../services/ai';
import { haptics } from '../services/haptics';

export function useSession() {
  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const sessionStartTime = useRef<Date | null>(null);

  // Cache for memory retrieval (avoid re-fetching on every message)
  const allMemoriesRef = useRef<MemoryNode[]>([]);
  const allMemoryVectorsRef = useRef<MemoryVector[]>([]);

  // Start a new session
  const startSession = useCallback(async () => {
    const session: JournalSession = {
      id: uuid(),
      startedAt: new Date(),
      transcript: '',
      duration: 0,
      wordCount: 0,
      messages: [],
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

    // Add initial AI greeting with TTS
    const greeting = ai.getGreeting();

    // Generate speech for greeting (don't await to avoid blocking)
    const greetingAudioPromise = ai.synthesizeSpeech(greeting);

    const aiMessage: Message = {
      id: uuid(),
      content: greeting,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages([aiMessage]);
    await database.addMessage(session.id, aiMessage);

    haptics.success();

    // Play greeting audio and wait for it to finish before returning
    // This ensures recording doesn't start until greeting is done
    try {
      const audioUri = await greetingAudioPromise;
      if (audioUri) {
        console.log('Playing greeting audio...');
        await audio.playAudio(audioUri);
        console.log('Greeting audio finished, ready for recording');
      }
    } catch (error) {
      console.warn('Failed to play greeting audio:', error);
    }

    return session;
  }, []);

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

    setConversationState('processing');
    const result = await audio.stopRecording();
    setIsRecording(false);
    haptics.recordingStopped();

    if (result) {
      // Transcribe audio
      const transcription = await ai.transcribeAudio(result.uri);

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

      // Generate AI response with full memory context
      setConversationState('responding');
      console.log('🎯 Starting AI response generation...');

      // Layer 2: Personal Knowledge Base (ALWAYS loaded)
      const personalFacts = await database.getActivePersonalFacts();
      console.log(`📚 Loaded ${personalFacts.length} personal facts`);

      // Layer 3 & 4: Find relevant past memories using semantic search
      // Use the user's latest message as context for retrieval
      console.log('🔍 Finding relevant memories...');
      const relevantMemories = await ai.findRelevantMemories(
        transcription.text,
        allMemoriesRef.current,
        3 // Top 3 most relevant memories
      );
      console.log(`💭 Found ${relevantMemories.length} relevant memories`);

      // Retrieve granular memory vectors (chunks/highlights)
      const relevantMemoryVectors = await ai.findRelevantMemoryVectors(
        transcription.text,
        allMemoryVectorsRef.current,
        5
      );
      console.log(`🧩 Found ${relevantMemoryVectors.length} memory snippets`);

      // Generate response with full context
      console.log('⚙️ Generating AI response...');
      const response = await ai.generateResponse(
        updatedMessages,
        personalFacts,
        relevantMemories,
        relevantMemoryVectors
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
    }

    setConversationState('idle');
  }, [currentSession, isRecording, messages]);

  // End the session
  const endSession = useCallback(async () => {
    if (!currentSession) return;

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

    // Layer 3: Synthesize memory node from session
    console.log('Synthesizing memory from session...');
    const memoryNode = await ai.synthesizeMemory(updatedSession);
    if (memoryNode.summary) {
      await database.saveMemoryNode(memoryNode);
      console.log('Memory saved:', memoryNode.summary.substring(0, 50) + '...');
    }

    // Layer 2: Extract and update personal knowledge
    console.log('Extracting personal knowledge...');
    const existingFacts = await database.getActivePersonalFacts();
    const newFacts = await ai.updatePersonalKnowledge(updatedSession, existingFacts);

    // Save new facts
    for (const fact of newFacts) {
      await database.savePersonalFact(fact);
      console.log(`New fact: ${fact.category}/${fact.key} = ${fact.value}`);
    }

    // Save updated existing facts (those that were deactivated)
    for (const fact of existingFacts) {
      if (!fact.isActive) {
        await database.savePersonalFact(fact);
      }
    }

    // Layer 4: Create and save chunk/highlight embeddings
    console.log('Generating memory vectors (chunks/highlights)...');
    await database.deleteMemoryVectorsForSession(updatedSession.id);
    const vectors = await ai.generateMemoryVectors(updatedSession, memoryNode);
    await database.saveMemoryVectors(vectors);
    console.log(`Memory vectors saved: ${vectors.length}`);

    haptics.sessionEnded();

    // Reset state
    setCurrentSession(null);
    setMessages([]);
    setConversationState('idle');
    sessionStartTime.current = null;
    allMemoriesRef.current = [];
    allMemoryVectorsRef.current = [];

    return updatedSession;
  }, [currentSession, messages]);

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
    messages,
    audioLevel,
    startSession,
    startRecording,
    stopRecording,
    endSession,
    pauseRecording,
    resumeRecording,
  };
}
