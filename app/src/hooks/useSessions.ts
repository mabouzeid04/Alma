import { useState, useEffect, useCallback } from 'react';
import { JournalSession } from '../types';
import * as database from '../services/database';
import { updatePatternsAfterSessionDeletion } from '../services/patterns';

export function useSessions() {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allSessions = await database.getAllSessions();
      setSessions(allSessions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load sessions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      // Update patterns to remove references to this session (cascade delete)
      await updatePatternsAfterSessionDeletion(id);
      // Delete the session itself
      await database.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete session'));
    }
  }, []);

  const getSession = useCallback(async (id: string): Promise<JournalSession | null> => {
    try {
      return await database.getSession(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get session'));
      return null;
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    deleteSession,
    getSession,
  };
}
