import { request } from './base.js';
import type { Item } from '../types/index.js';

export interface ItemFilters {
  search?:   string;
  category?: string;
  low_stock?: boolean;
  status?:   'critical' | 'warning' | 'normal';
  sort?:     string;
  order?:    'asc' | 'desc';
}

export interface ScannedItem {
  name: string;
  estimated_quantity: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export async function getItems(filters?: ItemFilters): Promise<{ data: Item[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.search)    params.set('search',    filters.search);
  if (filters?.category)  params.set('category',  filters.category);
  if (filters?.low_stock) params.set('low_stock',  'true');
  if (filters?.status)    params.set('status',    filters.status);
  if (filters?.sort)      params.set('sort',      filters.sort);
  if (filters?.order)     params.set('order',     filters.order);
  const qs = params.toString();
  return request(`/api/items${qs ? `?${qs}` : ''}`);
}

export async function getItem(id: number): Promise<{ data: Item }> {
  return request(`/api/items/${id}`);
}

export async function createItem(
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>,
): Promise<{ data: Item; ai_categorized: boolean }> {
  return request('/api/items', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateItem(
  id: number,
  patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>>,
): Promise<{ data: Item }> {
  return request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteItem(id: number): Promise<void> {
  return request(`/api/items/${id}`, { method: 'DELETE' });
}

export async function exportItems(): Promise<void> {
  const res  = await fetch('/api/items/export');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'shelfsense-export.json'; a.click();
  URL.revokeObjectURL(url);
}

export async function importItems(
  rows: Partial<Item>[],
): Promise<{ inserted: number; errors: Array<{ row: number; message: string }> }> {
  return request('/api/items/import', { method: 'POST', body: JSON.stringify(rows) });
}

export async function scanShelf(
  imageFile: File,
): Promise<{ items: ScannedItem[]; ai_generated: boolean }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
  return request('/api/items/scan-shelf', {
    method: 'POST',
    body: JSON.stringify({ image: base64, mimeType: imageFile.type }),
  });
}
