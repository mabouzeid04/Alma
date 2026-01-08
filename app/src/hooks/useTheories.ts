import { useState, useEffect, useCallback } from 'react';
import { Theory } from '../types';
import { getAllTheories, deleteTheory as dbDeleteTheory } from '../services/database';

export function useTheories() {
  const [theories, setTheories] = useState<Theory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTheories = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTheories = await getAllTheories();
      // Sort by confidence (most confident first), then by status
      const sortedTheories = allTheories.sort((a, b) => {
        // Status priority: confident > developing > questioning
        const statusOrder = { confident: 0, developing: 1, questioning: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.confidence - a.confidence;
      });
      setTheories(sortedTheories);
    } catch (error) {
      console.error('Failed to load theories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheories();
  }, [loadTheories]);

  const deleteTheory = useCallback(async (id: string) => {
    try {
      await dbDeleteTheory(id);
      setTheories(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete theory:', error);
      throw error;
    }
  }, []);

  return {
    theories,
    isLoading,
    deleteTheory,
    refresh: loadTheories,
  };
}
