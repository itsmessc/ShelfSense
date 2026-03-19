import { request } from './base.js';
import type { SupplierSuggestion } from '../types/index.js';

export async function getSupplierSuggestions(
  itemId: number,
): Promise<{ suggestions: SupplierSuggestion[]; ai_generated: boolean }> {
  return request(`/api/procurement/suggestions?itemId=${itemId}`);
}

export async function generateForecast(
  itemId: number,
): Promise<{ data: import('../types/index.js').ForecastResult }> {
  return request('/api/forecasts/generate', { method: 'POST', body: JSON.stringify({ item_id: itemId }) });
}
