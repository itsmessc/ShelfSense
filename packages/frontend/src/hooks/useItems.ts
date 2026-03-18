import { useState, useCallback } from 'react';
import * as api from '../api/client.js';
import type { Item } from '../types/index.js';
import type { ItemFilters } from '../api/client.js';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (filters?: ItemFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getItems(filters);
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>) => {
      const res = await api.createItem(payload);
      setItems((prev) => [res.data, ...prev]);
      return res;
    },
    []
  );

  const editItem = useCallback(
    async (id: number, patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>>) => {
      const res = await api.updateItem(id, patch);
      setItems((prev) => prev.map((i) => (i.id === id ? res.data : i)));
      return res.data;
    },
    []
  );

  const removeItem = useCallback(async (id: number) => {
    await api.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, total, isLoading, error, fetchItems, addItem, editItem, removeItem };
}
