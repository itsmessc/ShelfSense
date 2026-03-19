/**
 * OpenAI AI Provider — secondary fallback after Gemini.
 * Each function throws AiUnavailableError on failure so the orchestrator
 * can decide whether to surface the error or fall back to rule-based.
 */
import OpenAI from 'openai';
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

const TEXT_MODEL   = 'gpt-5.4';
const VISION_MODEL = 'gpt-4o';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('OPENAI_API_KEY not set');
  return new OpenAI({ apiKey });
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
  try {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{
        role: 'user',
        content: `You are an inventory categorization assistant. Given an item name and unit, return ONLY one category from this exact list:\n${CATEGORIES.join(', ')}\n\nItem: "${name}" (unit: ${unit})\nRespond with exactly one category name, nothing else.`,
      }],
      max_tokens: 20,
    });
    const text = res.choices[0]?.message?.content?.trim() ?? '';
    return CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? 'Other';
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function forecastStockout(item: Item, logs: UsageLog[]): Promise<ForecastResult> {
  try {
    const client = getClient();
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

    const res = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    const parsed = safeJson<{ days_until_stockout: number | null; confidence: string; reasoning: string }>(
      res.choices[0]?.message?.content ?? '',
    );
    if (!parsed) throw new Error('Invalid JSON response from OpenAI');

    const confidence = (['low', 'medium', 'high'].includes(parsed.confidence)
      ? parsed.confidence : 'medium') as ForecastResult['confidence'];

    const forecast = buildForecastResult(parsed.days_until_stockout, confidence, true, parsed.reasoning, 'openai');
    forecast.recommended_reorder_quantity =
      Number(item.reorder_threshold) > 0 ? Number(item.reorder_threshold) * 2 : null;
    return forecast;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function chatWithInventory(
  message: string,
  context: {
    items: Array<{ name: string; quantity: number; unit: string; category: string; alert_status?: string; expiry_date?: string | null; cost_per_unit?: number | null; reorder_threshold: number }>;
    totals: { item_count: number; critical_count: number; warning_count: number; expiring_within_7_days: number };
    forecast_alerts: Array<{ name: string; days_until_stockout: number; unit: string }>;
  },
): Promise<string> {
  try {
    const client = getClient();
    const systemPrompt = `You are ShelfSense, a smart green-tech inventory assistant. You help users manage their sustainable inventory.

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

    const res = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message },
      ],
      max_tokens: 300,
    });
    return res.choices[0]?.message?.content?.trim() ?? 'No response from AI.';
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function scanShelfImage(base64Image: string, mimeType: string): Promise<ScannedItem[]> {
  try {
    const client = getClient();
    const prompt = `You are an inventory scanning assistant. Analyze this shelf/storage image and identify all visible items.

For each distinct item, estimate the quantity remaining.
Return ONLY a valid JSON array (no markdown):
[{"name":"item name","estimated_quantity":<number>,"unit":"<kg|L|pcs|boxes|etc>","confidence":"<high|medium|low>","notes":"<optional>"}]

If you cannot identify any items, return [].`;

    const res = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          { type: 'text', text: prompt },
        ],
      }],
      max_tokens: 500,
    });

    const parsed = safeJson<ScannedItem[]>(res.choices[0]?.message?.content ?? '');
    if (!parsed || !Array.isArray(parsed)) throw new Error('Invalid JSON from OpenAI vision');
    return parsed.filter((i) => i.name && typeof i.estimated_quantity === 'number' && i.unit);
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function suggestSuppliers(
  item: Item,
  candidates: SupplierSuggestion[],
): Promise<SupplierSuggestion[]> {
  try {
    const client = getClient();
    const prompt = `You are a sustainable procurement assistant. Given an inventory item and a list of eco-friendly suppliers, select and rank the top 3 most suitable suppliers.

Item: ${item.name} (category: ${item.category}, unit: ${item.unit})
Current supplier: ${item.supplier ?? 'unknown'}
Current cost per unit: ${item.cost_per_unit ? `$${item.cost_per_unit}` : 'unknown'}

Suppliers (JSON): ${JSON.stringify(candidates.slice(0, 10).map((s) => ({ id: s.id, name: s.name, category: s.categories, eco: s.eco_credentials, carbon: s.carbon_footprint_kg, price: s.price_per_unit, local: s.is_local })))}

Return ONLY a JSON array of the top 3 supplier IDs in order of recommendation:
["id1", "id2", "id3"]`;

    const res = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
    });

    const ids = safeJson<string[]>(res.choices[0]?.message?.content ?? '');
    if (!ids || !Array.isArray(ids)) throw new Error('Invalid supplier IDs from OpenAI');

    return ids
      .map((id) => candidates.find((s) => s.id === id))
      .filter((s): s is SupplierSuggestion => s != null)
      .slice(0, 3);
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}
