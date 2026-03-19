/**
 * Item Service — business logic for inventory items.
 * Uses itemRepository for DB access and aiOrchestrator for AI categorization.
 */
import type { Pool } from 'mysql2/promise';
import type { Item, AlertStatus } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as itemRepo from '../repositories/itemRepository.js';
import * as ai from './ai/aiOrchestrator.js';
import * as fallback from './fallbackService.js';

// ── Alert status ──────────────────────────────────────────────────────────────

export function computeAlertStatus(item: Item): AlertStatus {
  const today = new Date();
  const qty       = Number(item.quantity);
  const threshold = Number(item.reorder_threshold);

  if (item.expiry_date) {
    const daysUntil = Math.round(
      (new Date(item.expiry_date).getTime() - today.getTime()) / 86400000,
    );
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 7) return 'warning';
  }

  if (threshold > 0) {
    if (qty <= threshold)        return 'critical';
    if (qty <= threshold * 1.5)  return 'warning';
  }

  return 'normal';
}

export function withAlertStatus(item: Item): Item {
  return { ...item, alert_status: computeAlertStatus(item) };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listItems(
  pool: Pool,
  filters: itemRepo.ItemFilters & { status?: AlertStatus },
): Promise<Item[]> {
  const rows = await itemRepo.findAll(pool, filters);
  let items  = rows.map(withAlertStatus);
  if (filters.status) {
    items = items.filter((i) => i.alert_status === filters.status);
  }
  return items;
}

export async function getItemById(pool: Pool, id: number): Promise<Item | null> {
  const row = await itemRepo.findById(pool, id);
  return row ? withAlertStatus(row) : null;
}

export async function createItem(
  pool: Pool,
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>,
): Promise<{ item: Item; ai_categorized: boolean }> {
  let { category } = payload;
  let ai_categorized = false;

  if (!category || category === 'Uncategorized') {
    try {
      category = await ai.categorizeItem(payload.name, payload.unit);
      ai_categorized = true;
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        category = fallback.categorizeItem(payload.name);
      } else {
        throw err;
      }
    }
  }

  const id   = await itemRepo.insert(pool, { ...payload, category });
  const item = await getItemById(pool, id);
  return { item: item!, ai_categorized };
}

export async function updateItem(
  pool: Pool,
  id: number,
  patch: itemRepo.UpdatePayload,
): Promise<Item | null> {
  await itemRepo.update(pool, id, patch);
  return getItemById(pool, id);
}

export async function deleteItem(pool: Pool, id: number): Promise<boolean> {
  return itemRepo.softDelete(pool, id);
}

// ── Bulk import / export ──────────────────────────────────────────────────────

export async function importItems(
  pool: Pool,
  rows: Array<Partial<Item>>,
): Promise<{ inserted: number; errors: Array<{ row: number; message: string }> }> {
  let inserted = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name?.trim())                                        { errors.push({ row: i + 1, message: 'name is required' }); continue; }
    if (row.quantity === undefined || isNaN(Number(row.quantity))) { errors.push({ row: i + 1, message: 'quantity must be a number' }); continue; }
    if (!row.unit?.trim())                                        { errors.push({ row: i + 1, message: 'unit is required' }); continue; }

    let category = row.category ?? 'Uncategorized';
    if (!category || category === 'Uncategorized') {
      try { category = await ai.categorizeItem(row.name, row.unit); }
      catch { category = fallback.categorizeItem(row.name); }
    }

    try {
      await itemRepo.insert(pool, {
        name: row.name.trim(),
        quantity: Number(row.quantity),
        unit: row.unit.trim(),
        category,
        expiry_date: row.expiry_date ?? null,
        reorder_threshold: Number(row.reorder_threshold ?? 0),
        cost_per_unit: row.cost_per_unit ? Number(row.cost_per_unit) : null,
        supplier: row.supplier ?? null,
        purchase_date: row.purchase_date ?? null,
      });
      inserted++;
    } catch (e) {
      errors.push({ row: i + 1, message: (e as Error).message });
    }
  }

  return { inserted, errors };
}

export async function exportItems(pool: Pool): Promise<Item[]> {
  const rows = await itemRepo.findAllActive(pool);
  return rows.map(withAlertStatus);
}
