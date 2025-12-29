export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  audioUri?: string;
}

export interface JournalSession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  transcript: string;
  duration: number; // in seconds
  wordCount: number;
  messages: Message[];
  memoryNode?: MemoryNode;
}

export interface MemoryNode {
  id: string;
  sessionId: string;
  createdAt: Date;
  summary: string;
  topics: string[];
  emotions: string[];
  events: string[];
  peopleMentioned: string[];
  thoughts: string[];
  unresolvedQuestions: string[];
  embedding?: number[]; // Vector embedding for semantic search
}

export interface PersonalFact {
  id: string;
  category: 'biographical' | 'preferences' | 'relationships' | 'goals' | 'habits';
  key: string;
  value: string;
  context?: string; // e.g., "as of March 2024"
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export type ConversationState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'responding'
  | 'paused';

export interface AppState {
  currentSession: JournalSession | null;
  conversationState: ConversationState;
  isRecording: boolean;
}
