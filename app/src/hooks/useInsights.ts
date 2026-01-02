import { useState, useEffect, useCallback } from 'react';
import { InsightsReport, InsightPeriod } from '../types';
import * as insightsService from '../services/insights';

export type InsightsState = 'idle' | 'loading' | 'generating' | 'ready' | 'error' | 'insufficient_data';

export function useInsights() {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [state, setState] = useState<InsightsState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<InsightPeriod>('week');
  const [sessionCount, setSessionCount] = useState<number>(0);

  const loadInsights = useCallback(async (period: InsightPeriod, forceRefresh = false) => {
    try {
      setState(forceRefresh ? 'generating' : 'loading');
      setError(null);

      // Check session count
      const count = await insightsService.getSessionCountForPeriod(period);
      setSessionCount(count);

      // Check if we can generate insights
      const canGenerate = await insightsService.canGenerateInsights(period);
      if (!canGenerate) {
        setState('insufficient_data');
        setReport(null);
        return;
      }

      // Get insights (cached or fresh)
      const insightsReport = await insightsService.getInsights(period, forceRefresh);

      if (insightsReport) {
        setReport(insightsReport);
        setState('ready');
      } else {
        setState('insufficient_data');
        setReport(null);
      }
    } catch (err) {
      console.error('Error loading insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
      setState('error');
    }
  }, []);

  const refreshInsights = useCallback(async () => {
    await loadInsights(selectedPeriod, true);
  }, [loadInsights, selectedPeriod]);

  const changePeriod = useCallback(async (period: InsightPeriod) => {
    setSelectedPeriod(period);
    await loadInsights(period, false);
  }, [loadInsights]);

  // Load insights on mount
  useEffect(() => {
    loadInsights(selectedPeriod, false);
  }, []);

  return {
    report,
    state,
    error,
    selectedPeriod,
    sessionCount,
    changePeriod,
    refreshInsights,
    loadInsights,
  };
}
