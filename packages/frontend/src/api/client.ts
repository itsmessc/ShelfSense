import { ApiError, type Item, type UsageHistory, type DashboardData } from '../types/index.js';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  low_stock?: boolean;
}

export async function getItems(filters?: ItemFilters): Promise<{ data: Item[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.low_stock) params.set('low_stock', 'true');
  const qs = params.toString();
  return request(`/api/items${qs ? `?${qs}` : ''}`);
}

export async function getItem(id: number): Promise<{ data: Item }> {
  return request(`/api/items/${id}`);
}

export async function createItem(
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>
): Promise<{ data: Item; ai_categorized: boolean }> {
  return request('/api/items', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateItem(
  id: number,
  patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>>
): Promise<{ data: Item }> {
  return request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteItem(id: number): Promise<void> {
  return request(`/api/items/${id}`, { method: 'DELETE' });
}

export async function logUsage(payload: {
  item_id: number;
  quantity_used: number;
  notes?: string;
}): Promise<{ data: unknown; updated_item_quantity: number }> {
  return request('/api/usage', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getUsageHistory(itemId: number): Promise<UsageHistory> {
  return request(`/api/usage/${itemId}`);
}

export async function getDashboard(): Promise<DashboardData> {
  return request('/api/dashboard');
}
