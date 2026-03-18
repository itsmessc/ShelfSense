import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiUnavailableError } from '../src/types/index.js';

// Mock AI service so tests don't need a real API key
vi.mock('../src/services/aiService.js', () => ({
  categorizeItem: vi.fn().mockResolvedValue('Grains & Cereals'),
  forecastStockout: vi.fn().mockResolvedValue({ days_until_stockout: 10, confidence: 'medium' }),
}));

// mysql2 returns [rows, fields] for SELECT and [ResultSetHeader, fields] for DML
function makePool(responses: unknown[]) {
  let idx = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      const resp = responses[idx++] ?? [[],undefined];
      return Promise.resolve(resp);
    }),
  };
}

import * as svc from '../src/services/inventoryService.js';
import type { Pool } from 'mysql2/promise';

const mockItem = {
  id: 1,
  name: 'Organic Oats',
  quantity: 2.5,
  unit: 'kg',
  category: 'Grains & Cereals',
  expiry_date: '2026-08-01',
  reorder_threshold: 1.0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('inventoryService - happy path', () => {
  it('creates an item and returns it with AI category', async () => {
    const pool = makePool([
      [{ insertId: 1, affectedRows: 1 }, undefined],  // INSERT
      [[mockItem], undefined],                          // SELECT by id
    ]);

    const result = await svc.createItem(pool as unknown as Pool, {
      name: 'Organic Oats',
      quantity: 2.5,
      unit: 'kg',
      category: 'Uncategorized',
      expiry_date: '2026-08-01',
      reorder_threshold: 1.0,
    });

    expect(result.item.name).toBe('Organic Oats');
    expect(result.item.category).toBe('Grains & Cereals');
    expect(result.ai_categorized).toBe(true);
  });

  it('lists items with search filter', async () => {
    const pool = makePool([
      [[mockItem], undefined], // SELECT
    ]);

    const items = await svc.listItems(pool as unknown as Pool, { search: 'oat' });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Organic Oats');
    // Verify LIKE param was used
    const call = (pool.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toContain('%oat%');
  });

  it('returns null for non-existent item', async () => {
    const pool = makePool([
      [[], undefined], // SELECT returns empty
    ]);
    const item = await svc.getItemById(pool as unknown as Pool, 9999);
    expect(item).toBeNull();
  });
});

describe('inventoryService - edge cases', () => {
  it('falls back to rule-based category when AI is unavailable', async () => {
    const aiMod = await import('../src/services/aiService.js');
    vi.mocked(aiMod.categorizeItem).mockRejectedValueOnce(new AiUnavailableError('no key'));

    const itemWithFallbackCat = { ...mockItem, id: 2, category: 'Grains & Cereals' };
    const pool = makePool([
      [{ insertId: 2, affectedRows: 1 }, undefined],  // INSERT
      [[itemWithFallbackCat], undefined],               // SELECT by id
    ]);

    const result = await svc.createItem(pool as unknown as Pool, {
      name: 'Brown Rice',
      quantity: 3,
      unit: 'kg',
      category: 'Uncategorized',
      expiry_date: null,
      reorder_threshold: 1,
    });

    // ai_categorized should be false since AI threw
    expect(result.ai_categorized).toBe(false);
    expect(result.item.id).toBe(2);
  });

  it('deleteItem returns false for non-existent id', async () => {
    const pool = makePool([
      [{ affectedRows: 0 }, undefined], // DELETE returns 0 rows affected
    ]);
    const deleted = await svc.deleteItem(pool as unknown as Pool, 9999);
    expect(deleted).toBe(false);
  });
});
