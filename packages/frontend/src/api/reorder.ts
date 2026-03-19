import { request } from './base.js';

export interface ReorderItem {
  id: number;
  name: string;
  unit: string;
  category: string;
  current_quantity: number;
  reorder_threshold: number;
  alert_status: string;
  suggested_order_qty: number | null;
  estimated_cost: number | null;
  cost_per_unit: number | null;
  supplier: string | null;
  days_until_stockout: number | null;
  reorder_date: string | null;
}

export async function getReorderQueue(): Promise<{
  items: ReorderItem[];
  total_estimated_cost: number;
}> {
  return request('/api/reorder');
}
