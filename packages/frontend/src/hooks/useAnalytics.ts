import { useState, useCallback } from 'react';
import { getAnalytics } from '../api/analytics.js';
import type { AnalyticsData } from '../api/analytics.js';

export function useAnalytics() {
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetchAnalytics };
}
