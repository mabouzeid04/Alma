import { useState, useEffect, useCallback } from 'react';
import { Pattern } from '../types';
import { getAllPatterns, hardDeletePattern } from '../services/database';

export function usePatterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    try {
      const allPatterns = await getAllPatterns();
      // Filter out soft-deleted patterns
      const activePatterns = allPatterns.filter(p => !p.deletedAt);
      setPatterns(activePatterns);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const deletePattern = useCallback(async (id: string) => {
    try {
      await hardDeletePattern(id);
      setPatterns(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      throw error;
    }
  }, []);

  return {
    patterns,
    isLoading,
    deletePattern,
    refresh: loadPatterns,
  };
}
