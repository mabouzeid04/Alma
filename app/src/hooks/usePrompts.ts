import { useState, useEffect, useCallback } from 'react';
import { Prompt } from '../types';
import * as promptsService from '../services/prompts';

export type PromptsState = 'loading' | 'ready' | 'generating' | 'insufficient_data';

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [state, setState] = useState<PromptsState>('loading');
  const [sessionsNeeded, setSessionsNeeded] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const loadPrompts = useCallback(async () => {
    try {
      setState('loading');
      setError(null);

      // Check if user has enough sessions
      const sessionsNeededCount = await promptsService.getSessionsNeededForPrompts();
      setSessionsNeeded(sessionsNeededCount);

      if (sessionsNeededCount > 0) {
        setState('insufficient_data');
        setPrompts([]);
        return;
      }

      // Load active prompts
      const activePrompts = await promptsService.getActivePrompts();
      setPrompts(activePrompts);
      setState('ready');
    } catch (err) {
      console.error('Error loading prompts:', err);
      setError(err instanceof Error ? err : new Error('Failed to load prompts'));
      setState('ready');
    }
  }, []);

  const generateMore = useCallback(async (count: number = 5): Promise<Prompt[]> => {
    try {
      setState('generating');
      setError(null);

      const newPrompts = await promptsService.generatePrompts(count);

      // Add to existing prompts
      setPrompts((prev) => [...newPrompts, ...prev]);
      setState('ready');

      return newPrompts;
    } catch (err) {
      console.error('Error generating prompts:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate prompts'));
      setState('ready');
      return [];
    }
  }, []);

  const dismissPrompt = useCallback(async (promptId: string) => {
    try {
      await promptsService.dismissPrompt(promptId);
      setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    } catch (err) {
      console.error('Error dismissing prompt:', err);
      setError(err instanceof Error ? err : new Error('Failed to dismiss prompt'));
    }
  }, []);

  const markExplored = useCallback(async (promptId: string, sessionId: string) => {
    try {
      await promptsService.markPromptExplored(promptId, sessionId);
      setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    } catch (err) {
      console.error('Error marking prompt explored:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark prompt explored'));
    }
  }, []);

  const getPromptOpener = useCallback((prompt: Prompt): string => {
    return promptsService.buildPromptSessionOpener(prompt);
  }, []);

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  return {
    prompts,
    state,
    sessionsNeeded,
    error,
    loadPrompts,
    generateMore,
    dismissPrompt,
    markExplored,
    getPromptOpener,
  };
}
