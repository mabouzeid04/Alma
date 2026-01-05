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
  sourcePromptId?: string;  // If started from a prompt
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

// Pattern Discovery types

export type PatternType =
  | 'emotional_trend'
  | 'opinion_evolution'
  | 'relationship'
  | 'unresolved_question';

export type PatternStatus =
  | 'developing'           // < 6 sessions, still gathering evidence
  | 'active'               // 6+ sessions, confident pattern
  | 'needs_review'         // Contradiction detected, user should review
  | 'insufficient_evidence' // Sessions deleted, not enough evidence remaining
  | 'resolved';            // User explicitly marked as no longer relevant

export interface PatternCounterEvidence {
  sessionId: string;
  quote: string;
  description: string;
  severity: 'minor' | 'major';
  detectedAt: string;
}

export interface Pattern {
  id: string;
  patternType: PatternType;
  description: string;  // Free-form narrative
  subject?: string;     // Person name, topic, or question

  // Evidence
  firstObserved: Date;
  lastUpdated: Date;
  relatedSessions: string[];  // Session IDs
  evidenceQuotes: string[];   // Supporting quotes

  // Confidence and status
  confidence: number;  // 0.0 to 1.0
  status: PatternStatus;

  // Contradiction handling
  counterEvidence?: PatternCounterEvidence[];
  contradictionFlaggedAt?: Date;

  // Lifecycle
  createdAt: Date;
  deletedAt?: Date;  // Soft delete
}

// Prompt types

export type PromptStatus = 'active' | 'explored' | 'dismissed' | 'expired';

export interface Prompt {
  id: string;
  question: string;          // The actual prompt question
  sourcePatternId?: string;  // Link to underlying pattern
  relatedSessions: string[]; // Session IDs this is based on
  status: PromptStatus;
  exploredSessionId?: string;
  createdAt: Date;
  expiresAt: Date;
}
