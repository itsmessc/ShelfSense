import { describe, it, expect } from 'vitest';
import { categorizeItem, forecastStockout } from '../src/services/fallbackService.js';
import type { Item, UsageLog } from '../src/types/index.js';

const baseItem: Item = {
  id: 1,
  name: 'Test Item',
  quantity: 1.0,
  unit: 'kg',
  category: 'Other',
  expiry_date: null,
  reorder_threshold: 0.5,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('fallbackService.categorizeItem - happy path', () => {
  it('categorizes coffee correctly', () => {
    expect(categorizeItem('Fair-Trade Coffee Beans')).toBe('Beverages');
  });

  it('categorizes oat milk as Dairy Alternatives', () => {
    expect(categorizeItem('Oat Milk Unsweetened')).toBe('Dairy Alternatives');
  });

  it('categorizes chickpeas as Legumes', () => {
    expect(categorizeItem('Canned Chickpeas')).toBe('Legumes');
  });

  it('returns Other for unknown items', () => {
    expect(categorizeItem('Xylophones and Gadgets')).toBe('Other');
  });
});

describe('fallbackService.forecastStockout - happy path', () => {
  it('returns null for empty logs', () => {
    const result = forecastStockout(baseItem, []);
    expect(result.days_until_stockout).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('calculates days correctly with usage logs', () => {
    const now = Date.now();
    const logs: UsageLog[] = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      item_id: 1,
      quantity_used: 0.1, // 0.1 kg/day
      logged_at: new Date(now - (6 - i) * 86400000).toISOString(),
      notes: null,
    }));

    // Item has 1.0 kg, avg daily = 0.1 → ~10 days
    const result = forecastStockout(baseItem, logs);
    expect(result.days_until_stockout).toBeGreaterThan(0);
    expect(result.confidence).toBe('high'); // 7 logs = high confidence
  });
});

describe('fallbackService.forecastStockout - edge cases', () => {
  it('handles single log entry with low confidence', () => {
    const logs: UsageLog[] = [
      { id: 1, item_id: 1, quantity_used: 0.2, logged_at: new Date().toISOString(), notes: null },
    ];
    const result = forecastStockout(baseItem, logs);
    expect(result.confidence).toBe('low');
  });

  it('returns low confidence for 3-6 logs (medium)', () => {
    const now = Date.now();
    const logs: UsageLog[] = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      item_id: 1,
      quantity_used: 0.05,
      logged_at: new Date(now - (3 - i) * 86400000).toISOString(),
      notes: null,
    }));
    const result = forecastStockout(baseItem, logs);
    expect(result.confidence).toBe('medium');
  });
});
