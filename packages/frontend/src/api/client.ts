import { ApiError, type Item, type UsageHistory, type DashboardData, type ForecastResult, type SupplierSuggestion } from '../types/index.js';

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
  status?: 'critical' | 'warning' | 'normal';
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function getItems(filters?: ItemFilters): Promise<{ data: Item[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.search)    params.set('search', filters.search);
  if (filters?.category)  params.set('category', filters.category);
  if (filters?.low_stock) params.set('low_stock', 'true');
  if (filters?.status)    params.set('status', filters.status);
  if (filters?.sort)      params.set('sort', filters.sort);
  if (filters?.order)     params.set('order', filters.order);
  const qs = params.toString();
  return request(`/api/items${qs ? `?${qs}` : ''}`);
}

export async function getItem(id: number): Promise<{ data: Item }> {
  return request(`/api/items/${id}`);
}

export async function createItem(
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>
): Promise<{ data: Item; ai_categorized: boolean }> {
  return request('/api/items', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateItem(
  id: number,
  patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>>
): Promise<{ data: Item }> {
  return request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteItem(id: number): Promise<void> {
  return request(`/api/items/${id}`, { method: 'DELETE' });
}

export async function exportItems(): Promise<void> {
  const res = await fetch('/api/items/export');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'shelfsense-export.json'; a.click();
  URL.revokeObjectURL(url);
}

export async function importItems(
  rows: Partial<Item>[]
): Promise<{ inserted: number; errors: Array<{ row: number; message: string }> }> {
  return request('/api/items/import', { method: 'POST', body: JSON.stringify(rows) });
}

export async function logUsage(payload: {
  item_id: number; quantity_used: number; notes?: string;
}): Promise<{ data: unknown; updated_item_quantity: number }> {
  return request('/api/usage', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getUsageHistory(itemId: number): Promise<UsageHistory> {
  return request(`/api/usage/${itemId}`);
}

export async function getRecentLogs(): Promise<{ data: Array<{
  id: number; item_id: number; quantity_used: number;
  logged_at: string; notes: string | null; item_name: string; unit: string;
}> }> {
  return request('/api/usage');
}

export async function getDashboard(): Promise<DashboardData> {
  return request('/api/dashboard');
}

export async function generateForecast(itemId: number): Promise<{ data: ForecastResult }> {
  return request('/api/forecasts/generate', { method: 'POST', body: JSON.stringify({ item_id: itemId }) });
}

export async function getSupplierSuggestions(
  itemId: number
): Promise<{ suggestions: SupplierSuggestion[]; ai_generated: boolean }> {
  return request(`/api/procurement/suggestions?itemId=${itemId}`);
}
