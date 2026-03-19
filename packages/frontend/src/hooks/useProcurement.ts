import { useState, useCallback } from 'react';
import { getSupplierSuggestions } from '../api/procurement.js';
import type { SupplierSuggestion } from '../types/index.js';

export function useProcurement() {
  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (itemId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const { suggestions: data, ai_generated } = await getSupplierSuggestions(itemId);
      setSuggestions(data);
      setAiGenerated(ai_generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supplier suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggestions, aiGenerated, isLoading, error, fetchSuggestions };
}
