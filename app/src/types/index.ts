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

export type MemoryVectorType = 'chunk' | 'highlight';

export interface MemoryVector {
  id: string;
  sessionId: string;
  type: MemoryVectorType;
  text: string;
  embedding?: number[];
  createdAt: Date;
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

// Insights types

export type InsightType = 'trend' | 'pattern' | 'growth' | 'suggestion' | 'reflection';
export type InsightPriority = 'high' | 'medium' | 'low';
export type EmotionTrend = 'improving' | 'stable' | 'declining' | 'mixed';
export type InsightPeriod = 'week' | 'month' | 'all_time';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  narrative: string;
  supportingData: {
    sessionsReferenced: string[];
    timePeriod: string;
    metrics?: Record<string, number>;
  };
  priority: InsightPriority;
  generatedAt: Date;
  expiresAt?: Date;
  period: InsightPeriod;
}

export interface EmotionalSummary {
  dominantEmotions: string[];
  emotionCounts: Record<string, number>;
  trend: EmotionTrend;
  trendNarrative: string;
}

export interface TopicSummary {
  recurringTopics: string[];
  emergingTopics: string[];
  resolvedTopics: string[];
}

export interface InsightsReport {
  id: string;
  generatedAt: Date;
  period: InsightPeriod;
  sessionCount: number;
  insights: Insight[];
  emotionalSummary: EmotionalSummary;
  topicSummary: TopicSummary;
}
