import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { Pool } from 'mysql2/promise';
import type { Supplier, SupplierSuggestion } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as aiService from './aiService.js';
import { getItemById } from './inventoryService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const suppliersPath = path.resolve(__dirname, '../data/sample-suppliers.json');
const allSuppliers: Supplier[] = JSON.parse(fs.readFileSync(suppliersPath, 'utf-8'));

function computeSustainabilityScore(s: Supplier): number {
  let score = 50;
  if (s.is_local) score += 20;
  score += Math.min(s.eco_credentials.length * 8, 24);
  score -= Math.min(s.carbon_footprint_kg * 4, 20);
  score += s.delivery_days <= 2 ? 6 : 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function enrichSupplier(s: Supplier, currentCostPerUnit?: number | null): SupplierSuggestion {
  let cost_comparison: SupplierSuggestion['cost_comparison'] = 'unknown';
  let cost_diff_pct: number | null = null;

  if (currentCostPerUnit != null && currentCostPerUnit > 0) {
    const diff = ((s.price_per_unit - currentCostPerUnit) / currentCostPerUnit) * 100;
    cost_diff_pct = Number(diff.toFixed(1));
    cost_comparison = diff < -2 ? 'cheaper' : diff > 2 ? 'more_expensive' : 'same';
  }

  return {
    ...s,
    cost_comparison,
    cost_diff_pct,
    sustainability_score: computeSustainabilityScore(s),
  };
}

function fallbackSuggest(category: string, currentCostPerUnit?: number | null): SupplierSuggestion[] {
  const matching = allSuppliers
    .filter((s) => s.categories.includes(category))
    .map((s) => enrichSupplier(s, currentCostPerUnit))
    .sort((a, b) => b.sustainability_score - a.sustainability_score);

  return matching.slice(0, 3);
}

export async function getSupplierSuggestions(
  pool: Pool,
  itemId: number
): Promise<{ suggestions: SupplierSuggestion[]; ai_generated: boolean }> {
  const item = await getItemById(pool, itemId);
  if (!item) throw new Error('Item not found');

  const candidates = allSuppliers
    .filter((s) => s.categories.includes(item.category))
    .map((s) => enrichSupplier(s, item.cost_per_unit));

  if (candidates.length === 0) {
    // No category match — return top-ranked across all
    const all = allSuppliers
      .map((s) => enrichSupplier(s, item.cost_per_unit))
      .sort((a, b) => b.sustainability_score - a.sustainability_score)
      .slice(0, 3);
    return { suggestions: all, ai_generated: false };
  }

  try {
    const aiRanked = await aiService.suggestSuppliers(item, candidates);
    return { suggestions: aiRanked, ai_generated: true };
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return { suggestions: fallbackSuggest(item.category, item.cost_per_unit), ai_generated: false };
    }
    throw err;
  }
}
