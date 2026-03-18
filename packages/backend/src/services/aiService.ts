import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiUnavailableError, type ForecastResult, type UsageLog, type Item, type SupplierSuggestion } from '../types/index.js';
import { buildForecastResult } from './fallbackService.js';

export const CATEGORIES = [
  'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Lab & Equipment', 'Chemicals',
  'Office Supplies', 'Other',
];

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(apiKey);
}

function safeJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) as T : null;
  } catch {
    return null;
  }
}

export async function categorizeItem(name: string, unit: string): Promise<string> {
  if (process.env.USE_FALLBACK_ONLY === 'true') throw new AiUnavailableError('Fallback mode');

  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(
      `You are an inventory categorization assistant. Given an item name and unit, return ONLY one category from this exact list:\n${CATEGORIES.join(', ')}\n\nItem: "${name}" (unit: ${unit})\nRespond with exactly one category name, nothing else.`
    );
    const text = result.response.text().trim();
    return CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? 'Other';
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function forecastStockout(item: Item, logs: UsageLog[]): Promise<ForecastResult> {
  if (process.env.USE_FALLBACK_ONLY === 'true') throw new AiUnavailableError('Fallback mode');

  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
    const recentLogs = logs.slice(-30).map((l) => ({ date: l.logged_at.slice(0, 10), used: l.quantity_used }));

    const prompt = `You are an inventory forecasting assistant. Analyze this data and predict days until stockout.

Item: ${item.name}
Current quantity: ${item.quantity} ${item.unit}
Reorder threshold: ${item.reorder_threshold} ${item.unit}
Usage logs (last 30): ${JSON.stringify(recentLogs)}

Respond ONLY with valid JSON:
{"days_until_stockout": <number or null>, "confidence": "<low|medium|high>", "reasoning": "<1 sentence>"}`;

    const result = await model.generateContent(prompt);
    const parsed = safeJson<{ days_until_stockout: number | null; confidence: string; reasoning: string }>(result.response.text());
    if (!parsed) throw new Error('Invalid JSON response');

    const confidence = (['low','medium','high'].includes(parsed.confidence)
      ? parsed.confidence : 'medium') as ForecastResult['confidence'];

    const forecast = buildForecastResult(parsed.days_until_stockout, confidence, true, parsed.reasoning);
    forecast.recommended_reorder_quantity =
      Number(item.reorder_threshold) > 0 ? Number(item.reorder_threshold) * 2 : null;
    return forecast;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function suggestSuppliers(
  item: Item,
  mockSuppliers: SupplierSuggestion[]
): Promise<SupplierSuggestion[]> {
  if (process.env.USE_FALLBACK_ONLY === 'true') throw new AiUnavailableError('Fallback mode');

  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a sustainable procurement assistant. Given an inventory item and a list of eco-friendly suppliers, select and rank the top 3 most suitable suppliers.

Item: ${item.name} (category: ${item.category}, unit: ${item.unit})
Current supplier: ${item.supplier ?? 'unknown'}
Current cost per unit: ${item.cost_per_unit ? `$${item.cost_per_unit}` : 'unknown'}

Suppliers (JSON): ${JSON.stringify(mockSuppliers.slice(0, 10).map(s => ({ id: s.id, name: s.name, category: s.categories, eco: s.eco_credentials, carbon: s.carbon_footprint_kg, price: s.price_per_unit, local: s.is_local })))}

Return ONLY a JSON array of the top 3 supplier IDs in order of recommendation:
["id1", "id2", "id3"]`;

    const result = await model.generateContent(prompt);
    const ids = safeJson<string[]>(result.response.text());
    if (!ids || !Array.isArray(ids)) throw new Error('Invalid response');

    const ranked = ids
      .map((id) => mockSuppliers.find((s) => s.id === id))
      .filter((s): s is SupplierSuggestion => s != null);

    return ranked.slice(0, 3);
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}
