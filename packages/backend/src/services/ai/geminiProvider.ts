/**
 * Gemini AI Provider.
 * Each function throws the raw error on failure — the orchestrator decides
 * whether to fall back to OpenAI or surface an AiUnavailableError.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AiUnavailableError,
  type ForecastResult,
  type UsageLog,
  type Item,
  type SupplierSuggestion,
} from '../../types/index.js';
import { buildForecastResult } from '../fallbackService.js';
import type { ScannedItem } from './types.js';
import { CATEGORIES } from './types.js';

const MODEL = 'gemini-3-flash-preview';

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(apiKey);
}

function safeJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? (JSON.parse(match[0]) as T) : null;
  } catch {
    return null;
  }
}

export async function categorizeItem(name: string, unit: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(
    `You are an inventory categorization assistant. Given an item name and unit, return ONLY one category from this exact list:\n${CATEGORIES.join(', ')}\n\nItem: "${name}" (unit: ${unit})\nRespond with exactly one category name, nothing else.`,
  );
  const text = result.response.text().trim();
  return CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? 'Other';
}

export async function forecastStockout(item: Item, logs: UsageLog[]): Promise<ForecastResult> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const recentLogs = logs.slice(-30).map((l) => ({
    date: new Date(l.logged_at).toISOString().slice(0, 10),
    used: l.quantity_used,
  }));
  const prompt = `You are an inventory forecasting assistant. Analyze this data and predict days until stockout.

Item: ${item.name}
Current quantity: ${item.quantity} ${item.unit}
Reorder threshold: ${item.reorder_threshold} ${item.unit}
Usage logs (last 30): ${JSON.stringify(recentLogs)}

Respond ONLY with valid JSON:
{"days_until_stockout": <number or null>, "confidence": "<low|medium|high>", "reasoning": "<1 sentence>"}`;

  const result = await model.generateContent(prompt);
  const parsed = safeJson<{ days_until_stockout: number | null; confidence: string; reasoning: string }>(
    result.response.text(),
  );
  if (!parsed) throw new Error('Invalid JSON response from Gemini');

  const confidence = (['low', 'medium', 'high'].includes(parsed.confidence)
    ? parsed.confidence : 'medium') as ForecastResult['confidence'];

  const forecast = buildForecastResult(parsed.days_until_stockout, confidence, true, parsed.reasoning, 'gemini');
  forecast.recommended_reorder_quantity =
    Number(item.reorder_threshold) > 0 ? Number(item.reorder_threshold) * 2 : null;
  return forecast;
}

export async function chatWithInventory(
  message: string,
  context: {
    items: Array<{ name: string; quantity: number; unit: string; category: string; alert_status?: string; expiry_date?: string | null; cost_per_unit?: number | null; reorder_threshold: number }>;
    totals: { item_count: number; critical_count: number; warning_count: number; expiring_within_7_days: number };
    forecast_alerts: Array<{ name: string; days_until_stockout: number; unit: string }>;
  },
): Promise<string> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const systemContext = `You are ShelfSense, a smart green-tech inventory assistant. You help users manage their sustainable inventory.

Current inventory snapshot (${new Date().toISOString().slice(0, 10)}):
- Total items: ${context.totals.item_count}
- Critical (needs immediate reorder): ${context.totals.critical_count}
- Warning (running low): ${context.totals.warning_count}
- Expiring within 7 days: ${context.totals.expiring_within_7_days}

Items running out soon (forecast alerts):
${context.forecast_alerts.length ? context.forecast_alerts.map((a) => `  • ${a.name}: ~${a.days_until_stockout} day(s) left`).join('\n') : '  None'}

Full inventory (name | qty | unit | category | status):
${context.items.map((i) => `  • ${i.name} | ${i.quantity} ${i.unit} | ${i.category} | ${i.alert_status ?? 'normal'}${i.expiry_date ? ` | expires ${i.expiry_date}` : ''}`).join('\n')}

Answer helpfully, concisely, and in a friendly tone. Focus on sustainability and reducing waste. Keep answers under 200 words.`;

  const result = await model.generateContent(`${systemContext}\n\nUser: ${message}`);
  return result.response.text().trim();
}

export async function scanShelfImage(base64Image: string, mimeType: string): Promise<ScannedItem[]> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const prompt = `You are an inventory scanning assistant. Analyze this shelf/storage image and identify all visible items.

For each distinct item you can see, estimate the quantity remaining.
Return ONLY a valid JSON array (no markdown, no explanation):
[{"name":"item name","estimated_quantity":<number>,"unit":"<kg|L|pcs|boxes|etc>","confidence":"<high|medium|low>","notes":"<optional>"}]

If you cannot identify any items, return [].`;

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Image } },
    prompt,
  ]);
  const parsed = safeJson<ScannedItem[]>(result.response.text());
  if (!parsed || !Array.isArray(parsed)) throw new Error('Invalid JSON from Gemini vision');
  return parsed.filter((i) => i.name && typeof i.estimated_quantity === 'number' && i.unit);
}

export async function suggestSuppliers(
  item: Item,
  candidates: SupplierSuggestion[],
): Promise<SupplierSuggestion[]> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const prompt = `You are a sustainable procurement assistant. Given an inventory item and a list of eco-friendly suppliers, select and rank the top 3 most suitable suppliers.

Item: ${item.name} (category: ${item.category}, unit: ${item.unit})
Current supplier: ${item.supplier ?? 'unknown'}
Current cost per unit: ${item.cost_per_unit ? `$${item.cost_per_unit}` : 'unknown'}

Suppliers (JSON): ${JSON.stringify(candidates.slice(0, 10).map((s) => ({ id: s.id, name: s.name, category: s.categories, eco: s.eco_credentials, carbon: s.carbon_footprint_kg, price: s.price_per_unit, local: s.is_local })))}

Return ONLY a JSON array of the top 3 supplier IDs in order of recommendation:
["id1", "id2", "id3"]`;

  const result = await model.generateContent(prompt);
  const ids = safeJson<string[]>(result.response.text());
  if (!ids || !Array.isArray(ids)) throw new Error('Invalid supplier IDs from Gemini');

  return ids
    .map((id) => candidates.find((s) => s.id === id))
    .filter((s): s is SupplierSuggestion => s != null)
    .slice(0, 3);
}
