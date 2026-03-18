import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiUnavailableError, type ForecastResult, type UsageLog, type Item } from '../types/index.js';

export const CATEGORIES = [
  'Grains & Cereals',
  'Dairy Alternatives',
  'Produce',
  'Legumes',
  'Beverages',
  'Oils & Fats',
  'Seeds & Nuts',
  'Cleaning Supplies',
  'Condiments',
  'Fermented Goods',
  'Other',
];

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(apiKey);
}

export async function categorizeItem(name: string, unit: string): Promise<string> {
  if (process.env.USE_FALLBACK_ONLY === 'true') throw new AiUnavailableError('Fallback mode');

  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an inventory categorization assistant. Given an item name and unit, return ONLY one category from this exact list:
${CATEGORIES.join(', ')}

Item: "${name}" (unit: ${unit})
Respond with exactly one category name from the list, nothing else.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Validate the response is one of our categories
    const matched = CATEGORIES.find(
      (c) => c.toLowerCase() === text.toLowerCase()
    );
    return matched ?? 'Other';
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}

export async function forecastStockout(
  item: Item,
  logs: UsageLog[]
): Promise<ForecastResult> {
  if (process.env.USE_FALLBACK_ONLY === 'true') throw new AiUnavailableError('Fallback mode');

  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const recentLogs = logs.slice(-30).map((l) => ({
      date: l.logged_at.slice(0, 10),
      used: l.quantity_used,
    }));

    const prompt = `You are an inventory forecasting assistant. Analyze this usage data and predict days until stockout.

Item: ${item.name}
Current quantity: ${item.quantity} ${item.unit}
Usage logs (last 30 entries): ${JSON.stringify(recentLogs)}

Respond with ONLY valid JSON in this exact format:
{"days_until_stockout": <number or null if insufficient data>, "confidence": "<low|medium|high>", "reasoning": "<1 sentence>"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as ForecastResult;
    return parsed;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(err);
  }
}
