import { useState, useCallback } from 'react';
import { getDashboard } from '../api/dashboard.js';
import type { DashboardData } from '../types/index.js';

export function useDashboard() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetchDashboard };
}
