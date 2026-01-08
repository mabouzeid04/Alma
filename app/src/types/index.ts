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
  | 'transcribing'
  | 'processing'
  | 'responding'
  | 'paused';

export interface AppState {
  currentSession: JournalSession | null;
  conversationState: ConversationState;
  isRecording: boolean;
}

// Insights types

export type InsightType = 'trend' | 'pattern' | 'growth' | 'suggestion' | 'reflection' | 'connection' | 'blind_spot';
export type InsightPriority = 'high' | 'medium' | 'low';
export type EmotionTrend = 'improving' | 'stable' | 'declining' | 'mixed';
export type InsightPeriod = 'week' | 'month' | 'all_time';
export type GrowthDirection = 'improving' | 'declining' | 'resolved' | 'new';

// Connection between topics, people, emotions, or times
export interface InsightConnection {
  items: string[];              // e.g., ["girlfriend", "school stress"] or ["Sunday evenings", "work anxiety"]
  correlationType: 'co_occurrence' | 'trigger' | 'temporal' | 'contrast';
  strength: 'strong' | 'moderate' | 'emerging';
}

// Growth/change tracking
export interface GrowthIndicator {
  topic: string;
  before: string;               // How it was before
  after: string;                // How it is now
  direction: GrowthDirection;
  timespan: string;             // "over the past month"
}

// Evidence from a specific session
export interface InsightEvidence {
  sessionId: string;
  sessionDate: Date;
  quote: string;                // Direct quote from session
  context?: string;             // Brief context about when this was said
}

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
  // Enhanced fields for Feature 4
  evidence?: InsightEvidence[];      // Direct quotes with session links
  connection?: InsightConnection;    // For 'connection' type insights
  growthIndicator?: GrowthIndicator; // For 'growth' type insights
  relatedPromptId?: string;          // Link to explore further via prompts
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

// Growth snapshot for the period
export interface GrowthSnapshot {
  resolved: string[];     // Concerns that have faded or been addressed
  improving: string[];    // Areas showing positive change
  newConcerns: string[];  // Recently emerged worries or focus areas
  stagnant: string[];     // Things mentioned repeatedly without progress
}

export interface InsightsReport {
  id: string;
  generatedAt: Date;
  period: InsightPeriod;
  sessionCount: number;
  insights: Insight[];
  emotionalSummary: EmotionalSummary;
  topicSummary: TopicSummary;
  growthSnapshot?: GrowthSnapshot;  // Overall growth/change summary for the period
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

// Personalization types

export interface EmotionalBaseline {
  dominantEmotions: string[];           // Most common emotions across recent sessions
  recentEmotions: string[];             // Emotions from last few sessions
  trend: 'improving' | 'stable' | 'declining' | 'mixed';
  trendNarrative: string;               // "You've seemed more stressed lately"
  deviationFromBaseline?: string;       // If current context suggests deviation
}

export interface PastReference {
  summary: string;                      // What was discussed
  emotionalContext: string;             // How they felt about it
  timeframeNatural: string;             // "a few weeks ago", "last month"
  sessionDate: Date;
  sessionId: string;
}

export interface TopicHistory {
  topic: string;
  pastDiscussions: PastReference[];
  opinionEvolution?: string;            // How their feelings have changed
  relatedPattern?: Pattern;
}

export interface ConversationContext {
  // Patterns relevant to current discussion
  relevantPatterns: Pattern[];

  // Emotional state information
  emotionalBaseline: EmotionalBaseline;

  // Unresolved questions they keep circling
  unresolvedQuestions: Pattern[];

  // History of specific topics being discussed
  topicHistories: TopicHistory[];

  // People mentioned and relationship patterns
  relationshipPatterns: Pattern[];

  // Working theories about the user
  relevantTheories: Theory[];

  // Natural conversation guidance
  probeOpportunities: string[];         // Things worth exploring deeper
  letFlowSignals: string[];             // Things they seem done with
}

// Working Theories - Long-term understanding (Feature 5)

export type TheoryStatus = 'developing' | 'confident' | 'questioning';

export type TheoryCategory =
  | 'values'         // What they value (independence, creativity, stability)
  | 'behaviors'      // How they tend to act (avoids conflict, processes alone)
  | 'relationships'  // How they relate to others (authority issues, attachment style)
  | 'beliefs'        // Core beliefs about self/world (impostor syndrome, optimism)
  | 'triggers';      // What triggers certain responses

export interface TheoryEvidence {
  sessionId: string;
  quote: string;
  supportType: 'supporting' | 'contradicting';
  addedAt: Date;
}

export interface Theory {
  id: string;
  // The theory itself - free-form narrative
  theory: string;
  // Short title for display
  title: string;
  // Category for organization
  category: TheoryCategory;
  // Confidence in this theory (0.0 to 1.0)
  confidence: number;
  // Status of the theory
  status: TheoryStatus;
  // Sessions that contributed to this theory
  evidenceSessions: string[];
  // Specific quotes as evidence
  evidence: TheoryEvidence[];
  // When we last evaluated/updated this theory
  lastEvaluated: Date;
  // When the theory was first formed
  firstFormed: Date;
  // If questioning, what prompted it
  questioningReason?: string;
  // Related patterns that support this theory
  relatedPatterns: string[];
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
