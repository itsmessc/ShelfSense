import { request } from './base.js';
import type { UsageLog, ForecastResult } from '../types/index.js';

export interface RecentLog {
  id: number;
  item_id: number;
  quantity_used: number;
  logged_at: string;
  notes: string | null;
  item_name: string;
  unit: string;
}

export interface UsageHistory {
  logs: UsageLog[];
  average_daily_usage: number | null;
  forecast: ForecastResult;
}

export async function getRecentLogs(limit = 50): Promise<{ data: RecentLog[] }> {
  return request(`/api/usage?limit=${limit}`);
}

export async function logUsage(payload: {
  item_id: number;
  quantity_used: number;
  notes?: string;
}): Promise<{ data: UsageLog; updated_item_quantity: number }> {
  return request('/api/usage', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getUsageHistory(itemId: number): Promise<UsageHistory> {
  return request(`/api/usage/${itemId}`);
}

export async function batchLogUsage(
  entries: Array<{ item_id: number; quantity_used: number; notes?: string }>,
): Promise<{ logged: number; errors: Array<{ index: number; message: string }> }> {
  return request('/api/usage/batch', { method: 'POST', body: JSON.stringify(entries) });
}
