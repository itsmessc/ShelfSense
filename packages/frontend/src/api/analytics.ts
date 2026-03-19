import { request } from './base.js';

export interface AnalyticsData {
  category_breakdown: Array<{ category: string; count: number; total_value: number }>;
  total_inventory_value: number;
  total_items: number;
  items_with_cost: number;
  items_with_supplier: number;
  unique_suppliers: number;
  daily_usage: Array<{ day: string; total_used: number; log_count: number }>;
  top_consumed: Array<{
    item_id: number; name: string; unit: string;
    category: string; total_used: number; log_count: number;
  }>;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return request('/api/analytics');
}
