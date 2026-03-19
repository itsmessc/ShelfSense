import { useState, useCallback } from 'react';
import { getReorderQueue } from '../api/reorder.js';
import type { ReorderItem } from '../api/reorder.js';

export function useReorder() {
  const [items, setItems]               = useState<ReorderItem[]>([]);
  const [totalCost, setTotalCost]       = useState(0);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { items: data, total_estimated_cost } = await getReorderQueue();
      setItems(data);
      setTotalCost(total_estimated_cost);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reorder queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { items, totalCost, isLoading, error, fetchQueue };
}
