/**
 * AI Orchestrator — wraps Gemini and throws AiUnavailableError on failure.
 *
 * Chain:  Gemini → (failure) → AiUnavailableError → caller uses rule-based fallback
 *
 * When USE_FALLBACK_ONLY=true, skips Gemini entirely.
 *
 * This is the only import point for AI capabilities across the app.
 */
import { AiUnavailableError, type ForecastResult, type UsageLog, type Item, type SupplierSuggestion } from '../../types/index.js';
import * as gemini from './geminiProvider.js';

export { CATEGORIES } from './types.js';
export type { ScannedItem } from './types.js';

async function withGemini<T>(label: string, call: () => Promise<T>): Promise<T> {
  if (process.env.USE_FALLBACK_ONLY === 'true') {
    throw new AiUnavailableError('Fallback-only mode');
  }
  try {
    return await call();
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    console.warn(`[AI] Gemini ${label} failed:`, (err as Error).message);
    throw new AiUnavailableError(err);
  }
}

export function categorizeItem(name: string, unit: string): Promise<string> {
  return withGemini('categorize', () => gemini.categorizeItem(name, unit));
}

export function forecastStockout(item: Item, logs: UsageLog[]): Promise<ForecastResult> {
  return withGemini('forecast', () => gemini.forecastStockout(item, logs));
}

export function chatWithInventory(
  message: string,
  context: Parameters<typeof gemini.chatWithInventory>[1],
): Promise<string> {
  return withGemini('chat', () => gemini.chatWithInventory(message, context));
}

export function scanShelfImage(
  base64Image: string,
  mimeType: string,
): Promise<Awaited<ReturnType<typeof gemini.scanShelfImage>>> {
  return withGemini('scan', () => gemini.scanShelfImage(base64Image, mimeType));
}

export function suggestSuppliers(
  item: Item,
  candidates: SupplierSuggestion[],
): Promise<SupplierSuggestion[]> {
  return withGemini('suppliers', () => gemini.suggestSuppliers(item, candidates));
}
