import * as SQLite from 'expo-sqlite';
import { JournalSession, MemoryNode, MemoryVector, PersonalFact, Message } from '../types';

const DATABASE_NAME = 'secondbrain.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
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
      word_count INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS personal_facts (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
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
    CREATE INDEX IF NOT EXISTS idx_personal_facts_category ON personal_facts (category);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_vectors_session ON memory_vectors (session_id);
  `);
}

// Session operations
export async function createSession(session: JournalSession): Promise<void> {
  const database = await getDatabase();
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
  };
}

export async function getAllSessions(): Promise<JournalSession[]> {
  const database = await getDatabase();
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
    });
  }

  return sessions;
}

export async function deleteSession(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
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

// Personal facts operations
export async function savePersonalFact(fact: PersonalFact): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO personal_facts
     (id, category, key, value, context, created_at, updated_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fact.id,
      fact.category,
      fact.key,
      fact.value,
      fact.context ?? null,
      fact.createdAt.toISOString(),
      fact.updatedAt.toISOString(),
      fact.isActive ? 1 : 0,
    ]
  );
}

export async function getActivePersonalFacts(): Promise<PersonalFact[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM personal_facts WHERE is_active = 1 ORDER BY category, key`
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    key: row.key,
    value: row.value,
    context: row.context ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isActive: row.is_active === 1,
  }));
}

export async function getPersonalFactsByCategory(
  category: PersonalFact['category']
): Promise<PersonalFact[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM personal_facts WHERE category = ? AND is_active = 1 ORDER BY key`,
    [category]
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    key: row.key,
    value: row.value,
    context: row.context ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isActive: row.is_active === 1,
  }));
}
