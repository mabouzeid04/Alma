import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { JournalSession, MemoryNode, MemoryVector, Message, Insight, InsightsReport, InsightPeriod, Pattern, PatternStatus, PatternType, PatternCounterEvidence, Prompt, PromptStatus, Theory, TheoryStatus, TheoryCategory, TheoryEvidence } from '../types';

const DATABASE_NAME = 'secondbrain.db';

let db: SQLite.SQLiteDatabase | null = null;
let e2eSeedApplied = false;
let e2eSeedScenario: {
  preset: 'empty' | 'single' | 'three' | 'streak3' | 'gap';
  offsets?: number[];
} | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await initializeTables();
  return db;
}

async function initializeTables(): Promise<void> {
  if (!db) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      transcript TEXT DEFAULT '',
      duration REAL DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      source_prompt_id TEXT,
      FOREIGN KEY (source_prompt_id) REFERENCES prompts (id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_user INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      audio_uri TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memory_nodes (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      summary TEXT DEFAULT '',
      topics TEXT DEFAULT '[]',
      emotions TEXT DEFAULT '[]',
      events TEXT DEFAULT '[]',
      people_mentioned TEXT DEFAULT '[]',
      thoughts TEXT DEFAULT '[]',
      unresolved_questions TEXT DEFAULT '[]',
      embedding TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS personal_knowledge (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_vectors (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id);
    CREATE INDEX IF NOT EXISTS idx_memory_nodes_session ON memory_nodes (session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_vectors_session ON memory_vectors (session_id);

    CREATE TABLE IF NOT EXISTS insights_reports (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      session_count INTEGER NOT NULL,
      generated_at TEXT NOT NULL,
      emotional_summary TEXT NOT NULL,
      topic_summary TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      narrative TEXT NOT NULL,
      supporting_data TEXT NOT NULL,
      priority TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      expires_at TEXT,
      period TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES insights_reports (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_insights_reports_period ON insights_reports (period);
    CREATE INDEX IF NOT EXISTS idx_insights_reports_generated_at ON insights_reports (generated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_insights_report ON insights (report_id);

    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,
      description TEXT NOT NULL,
      subject TEXT,
      first_observed TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      related_sessions TEXT NOT NULL,
      evidence_quotes TEXT,
      confidence REAL DEFAULT 0.5,
      status TEXT DEFAULT 'developing',
      counter_evidence TEXT,
      contradiction_flagged_at TEXT,
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns (pattern_type);
    CREATE INDEX IF NOT EXISTS idx_patterns_status ON patterns (status);
    CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns (confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_patterns_updated ON patterns (last_updated DESC);

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      source_pattern_id TEXT,
      related_sessions TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      explored_session_id TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (source_pattern_id) REFERENCES patterns (id),
      FOREIGN KEY (explored_session_id) REFERENCES sessions (id)
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts (status);
    CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_expires ON prompts (expires_at);

    CREATE TABLE IF NOT EXISTS theories (
      id TEXT PRIMARY KEY,
      theory TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL DEFAULT 0.3,
      status TEXT DEFAULT 'developing',
      evidence_sessions TEXT NOT NULL,
      evidence TEXT NOT NULL,
      last_evaluated TEXT NOT NULL,
      first_formed TEXT NOT NULL,
      questioning_reason TEXT,
      related_patterns TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_theories_status ON theories (status);
    CREATE INDEX IF NOT EXISTS idx_theories_category ON theories (category);
    CREATE INDEX IF NOT EXISTS idx_theories_confidence ON theories (confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_theories_updated ON theories (updated_at DESC);
  `);
}

// Session operations
export async function createSession(session: JournalSession): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO sessions (id, started_at, ended_at, transcript, duration, word_count, source_prompt_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.startedAt.toISOString(),
      session.endedAt?.toISOString() ?? null,
      session.transcript,
      session.duration,
      session.wordCount,
      session.sourcePromptId ?? null,
    ]
  );
}

export async function updateSession(session: JournalSession): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sessions SET ended_at = ?, transcript = ?, duration = ?, word_count = ?
     WHERE id = ?`,
    [
      session.endedAt?.toISOString() ?? null,
      session.transcript,
      session.duration,
      session.wordCount,
      session.id,
    ]
  );
}

export async function getSession(id: string): Promise<JournalSession | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM sessions WHERE id = ?`,
    [id]
  );

  if (!row) return null;

  const messages = await getMessagesForSession(id);

  return {
    id: row.id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
    transcript: row.transcript,
    duration: row.duration,
    wordCount: row.word_count,
    messages,
    sourcePromptId: row.source_prompt_id ?? undefined,
  };
}

export async function getAllSessions(): Promise<JournalSession[]> {
  const database = await getDatabase();
  await applyE2ESeedIfNeeded();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM sessions ORDER BY started_at DESC`
  );

  const sessions: JournalSession[] = [];
  for (const row of rows) {
    const messages = await getMessagesForSession(row.id);
    sessions.push({
      id: row.id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      transcript: row.transcript,
      duration: row.duration,
      wordCount: row.word_count,
      messages,
      sourcePromptId: row.source_prompt_id ?? undefined,
    });
  }

  return sessions;
}

export async function deleteSession(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
}

export async function clearAllSessions(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM messages;
    DELETE FROM memory_nodes;
    DELETE FROM memory_vectors;
    DELETE FROM insights;
    DELETE FROM insights_reports;
    DELETE FROM patterns;
    DELETE FROM prompts;
    DELETE FROM theories;
    DELETE FROM sessions;
    DELETE FROM personal_knowledge;
  `);
}

export function setE2ESeedScenario(seed: typeof e2eSeedScenario): void {
  e2eSeedScenario = seed;
  e2eSeedApplied = false;
}

export async function applyE2ESeedIfNeeded(force = false): Promise<void> {
  if (!e2eSeedScenario) return;
  if (e2eSeedApplied && !force) return;

  const scenario = e2eSeedScenario;
  e2eSeedApplied = true;

  const database = await getDatabase();
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await clearAllSessions();

  const sessions = buildSessionsFromScenario(scenario);
  if (sessions.length > 0) {
    await seedSessions(sessions);
  }
}

function buildSessionsFromScenario(seed: NonNullable<typeof e2eSeedScenario>): JournalSession[] {
  const now = new Date();
  const offsets =
    seed.offsets ??
    (seed.preset === 'three' || seed.preset === 'streak3'
      ? [0, 1, 2]
      : seed.preset === 'gap'
        ? [0, 2]
        : seed.preset === 'single'
          ? [0]
          : []);

  return offsets.map((daysAgo, idx) => {
    const start = new Date(now);
    start.setHours(10, 0, 0, 0);
    start.setDate(start.getDate() - daysAgo);
    const end = new Date(start.getTime() + 5 * 60 * 1000);
    return {
      id: `e2e-session-${idx}-${daysAgo}-${uuidv4()}`,
      startedAt: start,
      endedAt: end,
      transcript: `E2E seed session ${idx}`,
      duration: 300,
      wordCount: 120,
      messages: [],
    };
  });
}

export async function seedSessions(sessions: JournalSession[]): Promise<void> {
  const database = await getDatabase();
  for (const session of sessions) {
    await database.runAsync(
      `INSERT INTO sessions (id, started_at, ended_at, transcript, duration, word_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.startedAt.toISOString(),
        session.endedAt?.toISOString() ?? null,
        session.transcript,
        session.duration,
        session.wordCount,
      ]
    );
  }
}

// Message operations
export async function addMessage(
  sessionId: string,
  message: Message
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO messages (id, session_id, content, is_user, timestamp, audio_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      message.id,
      sessionId,
      message.content,
      message.isUser ? 1 : 0,
      message.timestamp.toISOString(),
      message.audioUri ?? null,
    ]
  );
}

export async function getMessagesForSession(
  sessionId: string
): Promise<Message[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    isUser: row.is_user === 1,
    timestamp: new Date(row.timestamp),
    audioUri: row.audio_uri ?? undefined,
  }));
}

// Memory node operations
export async function saveMemoryNode(node: MemoryNode): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO memory_nodes
     (id, session_id, created_at, summary, topics, emotions, events, people_mentioned, thoughts, unresolved_questions, embedding)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      node.id,
      node.sessionId,
      node.createdAt.toISOString(),
      node.summary,
      JSON.stringify(node.topics),
      JSON.stringify(node.emotions),
      JSON.stringify(node.events),
      JSON.stringify(node.peopleMentioned),
      JSON.stringify(node.thoughts),
      JSON.stringify(node.unresolvedQuestions),
      node.embedding ? JSON.stringify(node.embedding) : null,
    ]
  );
}

export async function getMemoryNodeForSession(
  sessionId: string
): Promise<MemoryNode | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM memory_nodes WHERE session_id = ?`,
    [sessionId]
  );

  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    createdAt: new Date(row.created_at),
    summary: row.summary,
    topics: JSON.parse(row.topics),
    emotions: JSON.parse(row.emotions),
    events: JSON.parse(row.events),
    peopleMentioned: JSON.parse(row.people_mentioned),
    thoughts: JSON.parse(row.thoughts),
    unresolvedQuestions: JSON.parse(row.unresolved_questions),
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
  };
}

// Memory vector operations

export async function deleteMemoryVectorsForSession(sessionId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM memory_vectors WHERE session_id = ?`, [sessionId]);
}

export async function saveMemoryVectors(vectors: MemoryVector[]): Promise<void> {
  if (vectors.length === 0) return;
  const database = await getDatabase();
  const insertStmt = `INSERT OR REPLACE INTO memory_vectors
    (id, session_id, type, text, embedding, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`;

  for (const vector of vectors) {
    await database.runAsync(insertStmt, [
      vector.id,
      vector.sessionId,
      vector.type,
      vector.text,
      vector.embedding ? JSON.stringify(vector.embedding) : null,
      vector.createdAt.toISOString(),
    ]);
  }
}

export async function getMemoryVectorsForSession(sessionId: string): Promise<MemoryVector[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM memory_vectors WHERE session_id = ? ORDER BY created_at DESC`,
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    text: row.text,
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    createdAt: new Date(row.created_at),
  }));
}

// Personal knowledge operations (markdown-based)
export async function getPersonalKnowledge(): Promise<string> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT content FROM personal_knowledge WHERE id = 'default'`
  );
  return row?.content ?? '';
}

export async function savePersonalKnowledge(content: string): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT OR REPLACE INTO personal_knowledge (id, content, updated_at) VALUES (?, ?, ?)`,
    ['default', content, now]
  );
}

// Aggregation operations for insights

export async function getAllMemoryNodes(): Promise<MemoryNode[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM memory_nodes ORDER BY created_at DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    createdAt: new Date(row.created_at),
    summary: row.summary,
    topics: JSON.parse(row.topics),
    emotions: JSON.parse(row.emotions),
    events: JSON.parse(row.events),
    peopleMentioned: JSON.parse(row.people_mentioned),
    thoughts: JSON.parse(row.thoughts),
    unresolvedQuestions: JSON.parse(row.unresolved_questions),
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
  }));
}

export async function getAllMemoryVectors(): Promise<MemoryVector[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM memory_vectors ORDER BY created_at DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    text: row.text,
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    createdAt: new Date(row.created_at),
  }));
}

export async function getSessionsInDateRange(
  startDate: Date,
  endDate: Date
): Promise<JournalSession[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM sessions
     WHERE started_at >= ? AND started_at <= ?
     ORDER BY started_at DESC`,
    [startDate.toISOString(), endDate.toISOString()]
  );

  const sessions: JournalSession[] = [];
  for (const row of rows) {
    const messages = await getMessagesForSession(row.id);
    sessions.push({
      id: row.id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      transcript: row.transcript,
      duration: row.duration,
      wordCount: row.word_count,
      messages,
      sourcePromptId: row.source_prompt_id ?? undefined,
    });
  }

  return sessions;
}

export async function getMemoryNodesInDateRange(
  startDate: Date,
  endDate: Date
): Promise<MemoryNode[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM memory_nodes
     WHERE created_at >= ? AND created_at <= ?
     ORDER BY created_at DESC`,
    [startDate.toISOString(), endDate.toISOString()]
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    createdAt: new Date(row.created_at),
    summary: row.summary,
    topics: JSON.parse(row.topics),
    emotions: JSON.parse(row.emotions),
    events: JSON.parse(row.events),
    peopleMentioned: JSON.parse(row.people_mentioned),
    thoughts: JSON.parse(row.thoughts),
    unresolvedQuestions: JSON.parse(row.unresolved_questions),
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
  }));
}

export async function getSessionCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sessions`
  );
  return result?.count ?? 0;
}

// Insights operations

export async function saveInsightsReport(report: InsightsReport): Promise<void> {
  const database = await getDatabase();

  // Save the report
  await database.runAsync(
    `INSERT OR REPLACE INTO insights_reports
     (id, period, session_count, generated_at, emotional_summary, topic_summary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.period,
      report.sessionCount,
      report.generatedAt.toISOString(),
      JSON.stringify(report.emotionalSummary),
      JSON.stringify(report.topicSummary),
    ]
  );

  // Delete old insights for this report
  await database.runAsync(`DELETE FROM insights WHERE report_id = ?`, [report.id]);

  // Save individual insights
  for (const insight of report.insights) {
    await database.runAsync(
      `INSERT INTO insights
       (id, report_id, type, title, narrative, supporting_data, priority, generated_at, expires_at, period)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insight.id,
        report.id,
        insight.type,
        insight.title,
        insight.narrative,
        JSON.stringify(insight.supportingData),
        insight.priority,
        insight.generatedAt.toISOString(),
        insight.expiresAt?.toISOString() ?? null,
        insight.period,
      ]
    );
  }
}

export async function getInsightsReportForPeriod(
  period: InsightPeriod
): Promise<InsightsReport | null> {
  const database = await getDatabase();

  const reportRow = await database.getFirstAsync<any>(
    `SELECT * FROM insights_reports
     WHERE period = ?
     ORDER BY generated_at DESC
     LIMIT 1`,
    [period]
  );

  if (!reportRow) return null;

  const insightRows = await database.getAllAsync<any>(
    `SELECT * FROM insights WHERE report_id = ? ORDER BY priority ASC`,
    [reportRow.id]
  );

  const insights: Insight[] = insightRows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    narrative: row.narrative,
    supportingData: JSON.parse(row.supporting_data),
    priority: row.priority,
    generatedAt: new Date(row.generated_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    period: row.period,
  }));

  return {
    id: reportRow.id,
    generatedAt: new Date(reportRow.generated_at),
    period: reportRow.period,
    sessionCount: reportRow.session_count,
    insights,
    emotionalSummary: JSON.parse(reportRow.emotional_summary),
    topicSummary: JSON.parse(reportRow.topic_summary),
  };
}

export async function deleteInsightsReportForPeriod(period: InsightPeriod): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `DELETE FROM insights_reports WHERE period = ?`,
    [period]
  );
}

export async function clearAllInsights(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM insights`);
  await database.runAsync(`DELETE FROM insights_reports`);
}

// Pattern operations

function rowToPattern(row: any): Pattern {
  return {
    id: row.id,
    patternType: row.pattern_type as PatternType,
    description: row.description,
    subject: row.subject ?? undefined,
    firstObserved: new Date(row.first_observed),
    lastUpdated: new Date(row.last_updated),
    relatedSessions: JSON.parse(row.related_sessions || '[]'),
    evidenceQuotes: JSON.parse(row.evidence_quotes || '[]'),
    confidence: row.confidence ?? 0.5,
    status: (row.status ?? 'developing') as PatternStatus,
    counterEvidence: row.counter_evidence ? JSON.parse(row.counter_evidence) : undefined,
    contradictionFlaggedAt: row.contradiction_flagged_at ? new Date(row.contradiction_flagged_at) : undefined,
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

export async function createPattern(pattern: Pattern): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO patterns (
      id, pattern_type, description, subject,
      first_observed, last_updated, related_sessions, evidence_quotes,
      confidence, status, counter_evidence, contradiction_flagged_at,
      created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pattern.id,
      pattern.patternType,
      pattern.description,
      pattern.subject ?? null,
      pattern.firstObserved.toISOString(),
      pattern.lastUpdated.toISOString(),
      JSON.stringify(pattern.relatedSessions),
      JSON.stringify(pattern.evidenceQuotes || []),
      pattern.confidence,
      pattern.status,
      JSON.stringify(pattern.counterEvidence || []),
      pattern.contradictionFlaggedAt?.toISOString() ?? null,
      pattern.createdAt.toISOString(),
      pattern.deletedAt?.toISOString() ?? null,
    ]
  );
}

export async function updatePattern(
  id: string,
  updates: Partial<Omit<Pattern, 'id' | 'createdAt'>>
): Promise<void> {
  const database = await getDatabase();

  // Get current pattern
  const existing = await getPattern(id);
  if (!existing) return;

  // Build update query dynamically
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.subject !== undefined) {
    fields.push('subject = ?');
    values.push(updates.subject);
  }
  if (updates.lastUpdated !== undefined) {
    fields.push('last_updated = ?');
    values.push(updates.lastUpdated.toISOString());
  }
  if (updates.relatedSessions !== undefined) {
    fields.push('related_sessions = ?');
    values.push(JSON.stringify(updates.relatedSessions));
  }
  if (updates.evidenceQuotes !== undefined) {
    fields.push('evidence_quotes = ?');
    values.push(JSON.stringify(updates.evidenceQuotes));
  }
  if (updates.confidence !== undefined) {
    fields.push('confidence = ?');
    values.push(updates.confidence);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.counterEvidence !== undefined) {
    fields.push('counter_evidence = ?');
    values.push(JSON.stringify(updates.counterEvidence));
  }
  if (updates.contradictionFlaggedAt !== undefined) {
    fields.push('contradiction_flagged_at = ?');
    values.push(updates.contradictionFlaggedAt?.toISOString() ?? null);
  }
  if (updates.deletedAt !== undefined) {
    fields.push('deleted_at = ?');
    values.push(updates.deletedAt?.toISOString() ?? null);
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE patterns SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getPattern(id: string): Promise<Pattern | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM patterns WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return rowToPattern(row);
}

export async function getAllPatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns WHERE deleted_at IS NULL ORDER BY last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getActivePatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY confidence DESC, last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getDevelopingPatterns(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE status = 'developing' AND deleted_at IS NULL
     ORDER BY last_updated DESC`
  );
  return rows.map(rowToPattern);
}

export async function getPatternsNeedingReview(): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE status IN ('needs_review', 'insufficient_evidence') AND deleted_at IS NULL
     ORDER BY contradiction_flagged_at DESC`
  );
  return rows.map(rowToPattern);
}

export async function getPatternsByType(type: PatternType): Promise<Pattern[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM patterns
     WHERE pattern_type = ? AND deleted_at IS NULL
     ORDER BY confidence DESC, last_updated DESC`,
    [type]
  );
  return rows.map(rowToPattern);
}

export async function findPatternBySubject(subject: string): Promise<Pattern | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM patterns
     WHERE subject = ? AND deleted_at IS NULL
     ORDER BY confidence DESC
     LIMIT 1`,
    [subject]
  );
  if (!row) return null;
  return rowToPattern(row);
}

export async function findDevelopingPatternBySubject(subject: string): Promise<Pattern | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM patterns
     WHERE subject = ? AND status = 'developing' AND deleted_at IS NULL
     LIMIT 1`,
    [subject]
  );
  if (!row) return null;
  return rowToPattern(row);
}

export async function deletePattern(id: string): Promise<void> {
  const database = await getDatabase();
  // Soft delete for audit trail
  await database.runAsync(
    `UPDATE patterns SET deleted_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function hardDeletePattern(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM patterns WHERE id = ?`, [id]);
}

export async function clearAllPatterns(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM patterns`);
}

// Prompt operations

function rowToPrompt(row: any): Prompt {
  return {
    id: row.id,
    question: row.question,
    sourcePatternId: row.source_pattern_id ?? undefined,
    relatedSessions: JSON.parse(row.related_sessions || '[]'),
    status: (row.status ?? 'active') as PromptStatus,
    exploredSessionId: row.explored_session_id ?? undefined,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
  };
}

export async function createPrompt(prompt: Prompt): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO prompts (
      id, question, source_pattern_id, related_sessions,
      status, explored_session_id, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prompt.id,
      prompt.question,
      prompt.sourcePatternId ?? null,
      JSON.stringify(prompt.relatedSessions),
      prompt.status,
      prompt.exploredSessionId ?? null,
      prompt.createdAt.toISOString(),
      prompt.expiresAt.toISOString(),
    ]
  );
}

export async function updatePrompt(
  id: string,
  updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>
): Promise<void> {
  const database = await getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.question !== undefined) {
    fields.push('question = ?');
    values.push(updates.question);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.exploredSessionId !== undefined) {
    fields.push('explored_session_id = ?');
    values.push(updates.exploredSessionId);
  }
  if (updates.expiresAt !== undefined) {
    fields.push('expires_at = ?');
    values.push(updates.expiresAt.toISOString());
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE prompts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM prompts WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return rowToPrompt(row);
}

export async function getActivePrompts(): Promise<Prompt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM prompts
     WHERE status = 'active'
     ORDER BY created_at DESC`
  );
  return rows.map(rowToPrompt);
}

export async function getAllPrompts(): Promise<Prompt[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM prompts ORDER BY created_at DESC`
  );
  return rows.map(rowToPrompt);
}

export async function getExpiredPrompts(): Promise<Prompt[]> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM prompts
     WHERE status = 'active' AND expires_at < ?
     ORDER BY created_at DESC`,
    [now]
  );
  return rows.map(rowToPrompt);
}

export async function markExpiredPrompts(): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE prompts SET status = 'expired'
     WHERE status = 'active' AND expires_at < ?`,
    [now]
  );
  return result.changes;
}

export async function deleteOldPrompts(daysOld: number): Promise<number> {
  const database = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const result = await database.runAsync(
    `DELETE FROM prompts WHERE created_at < ? AND status != 'active'`,
    [cutoff.toISOString()]
  );
  return result.changes;
}

export async function deletePrompt(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM prompts WHERE id = ?`, [id]);
}

export async function clearAllPrompts(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM prompts`);
}

// Theory operations

function rowToTheory(row: any): Theory {
  return {
    id: row.id,
    theory: row.theory,
    title: row.title,
    category: row.category as TheoryCategory,
    confidence: row.confidence ?? 0.3,
    status: (row.status ?? 'developing') as TheoryStatus,
    evidenceSessions: JSON.parse(row.evidence_sessions || '[]'),
    evidence: JSON.parse(row.evidence || '[]').map((e: any) => ({
      ...e,
      addedAt: new Date(e.addedAt),
    })),
    lastEvaluated: new Date(row.last_evaluated),
    firstFormed: new Date(row.first_formed),
    questioningReason: row.questioning_reason ?? undefined,
    relatedPatterns: JSON.parse(row.related_patterns || '[]'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function createTheory(theory: Theory): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO theories (
      id, theory, title, category, confidence, status,
      evidence_sessions, evidence, last_evaluated, first_formed,
      questioning_reason, related_patterns, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      theory.id,
      theory.theory,
      theory.title,
      theory.category,
      theory.confidence,
      theory.status,
      JSON.stringify(theory.evidenceSessions),
      JSON.stringify(theory.evidence.map((e) => ({ ...e, addedAt: e.addedAt.toISOString() }))),
      theory.lastEvaluated.toISOString(),
      theory.firstFormed.toISOString(),
      theory.questioningReason ?? null,
      JSON.stringify(theory.relatedPatterns),
      theory.createdAt.toISOString(),
      theory.updatedAt.toISOString(),
    ]
  );
}

export async function updateTheory(
  id: string,
  updates: Partial<Omit<Theory, 'id' | 'createdAt'>>
): Promise<void> {
  const database = await getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.theory !== undefined) {
    fields.push('theory = ?');
    values.push(updates.theory);
  }
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.confidence !== undefined) {
    fields.push('confidence = ?');
    values.push(updates.confidence);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.evidenceSessions !== undefined) {
    fields.push('evidence_sessions = ?');
    values.push(JSON.stringify(updates.evidenceSessions));
  }
  if (updates.evidence !== undefined) {
    fields.push('evidence = ?');
    values.push(JSON.stringify(updates.evidence.map((e) => ({ ...e, addedAt: e.addedAt.toISOString() }))));
  }
  if (updates.lastEvaluated !== undefined) {
    fields.push('last_evaluated = ?');
    values.push(updates.lastEvaluated.toISOString());
  }
  if (updates.questioningReason !== undefined) {
    fields.push('questioning_reason = ?');
    values.push(updates.questioningReason);
  }
  if (updates.relatedPatterns !== undefined) {
    fields.push('related_patterns = ?');
    values.push(JSON.stringify(updates.relatedPatterns));
  }
  if (updates.updatedAt !== undefined) {
    fields.push('updated_at = ?');
    values.push(updates.updatedAt.toISOString());
  }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE theories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getTheory(id: string): Promise<Theory | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM theories WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return rowToTheory(row);
}

export async function getAllTheories(): Promise<Theory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM theories ORDER BY confidence DESC, updated_at DESC`
  );
  return rows.map(rowToTheory);
}

export async function getConfidentTheories(): Promise<Theory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM theories
     WHERE status = 'confident'
     ORDER BY confidence DESC, updated_at DESC`
  );
  return rows.map(rowToTheory);
}

export async function getDevelopingTheories(): Promise<Theory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM theories
     WHERE status = 'developing'
     ORDER BY confidence DESC, updated_at DESC`
  );
  return rows.map(rowToTheory);
}

export async function getQuestioningTheories(): Promise<Theory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM theories
     WHERE status = 'questioning'
     ORDER BY updated_at DESC`
  );
  return rows.map(rowToTheory);
}

export async function getTheoriesByCategory(category: TheoryCategory): Promise<Theory[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM theories
     WHERE category = ?
     ORDER BY confidence DESC, updated_at DESC`,
    [category]
  );
  return rows.map(rowToTheory);
}

export async function findTheoryByTitle(title: string): Promise<Theory | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    `SELECT * FROM theories
     WHERE title = ?
     LIMIT 1`,
    [title]
  );
  if (!row) return null;
  return rowToTheory(row);
}

export async function deleteTheory(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM theories WHERE id = ?`, [id]);
}

export async function clearAllTheories(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM theories`);
}
