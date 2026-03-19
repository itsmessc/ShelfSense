import { useState, useCallback } from 'react';
import { generateForecast } from '../api/procurement.js';
import type { ForecastResult } from '../types/index.js';

export function useForecast() {
  const [forecast, setForecast]   = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchForecast = useCallback(async (itemId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await generateForecast(itemId);
      setForecast(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { forecast, isLoading, error, fetchForecast };
}
