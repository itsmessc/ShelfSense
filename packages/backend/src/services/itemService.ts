/**
 * Item Service — business logic for inventory items.
 * Uses itemRepository for DB access and aiOrchestrator for AI categorization.
 */
import type { Pool } from 'mysql2/promise';
import type { Item, AlertStatus } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as itemRepo from '../repositories/itemRepository.js';
import * as batchRepo from '../repositories/batchRepository.js';
import * as ai from './ai/aiOrchestrator.js';
import * as fallback from './fallbackService.js';

// ── Alert status ──────────────────────────────────────────────────────────────

export function computeAlertStatus(item: Item): AlertStatus {
  // ... (previous implementation same)
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

// ── Batch Synchronization ─────────────────────────────────────────────────────

/**
 * Re-calculate main item quantity and earliest expiry from its batches.
 */
export async function syncItemTotals(pool: Pool, itemId: number): Promise<void> {
  const batches = await batchRepo.findByItemId(pool, itemId);
  const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
  
  // Earliest expiry date from active batches
  const earliestExpiry = batches
    .filter(b => b.expiry_date)
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())[0]?.expiry_date || null;

  await itemRepo.update(pool, itemId, { 
    quantity: totalQty,
    expiry_date: earliestExpiry 
  });
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
  if (!row) return null;
  const batches = await batchRepo.findByItemId(pool, id);
  return { ...withAlertStatus(row), batches: batches as any };
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

  const id = await itemRepo.insert(pool, { ...payload, category });
  
  // Create the initial batch
  await batchRepo.insert(pool, {
    item_id: id,
    quantity: payload.quantity,
    expiry_date: payload.expiry_date
  });

  const item = await getItemById(pool, id);
  return { item: item!, ai_categorized };
}

export async function updateItem(
  pool: Pool,
  id: number,
  patch: itemRepo.UpdatePayload,
): Promise<Item | null> {
  const oldItem = await itemRepo.findById(pool, id);
  await itemRepo.update(pool, id, patch);
  
  // If quantity was explicitly updated (e.g. from the UI reorder queue), 
  // we create a NEW batch for the delta if it's an increase.
  if (patch.quantity !== undefined && oldItem) {
    const delta = patch.quantity - oldItem.quantity;
    if (delta > 0) {
      await batchRepo.insert(pool, {
        item_id: id,
        quantity: delta,
        expiry_date: patch.expiry_date !== undefined ? patch.expiry_date : oldItem.expiry_date
      });
      // After inserting batch, re-sync to ensure the items table has correct totals
      await syncItemTotals(pool, id);
    } else if (delta < 0) {
      // For manual decreases (waste/correction), we use FEFO as well
      await batchRepo.deductFEFO(pool, id, Math.abs(delta));
      await syncItemTotals(pool, id);
    }
  } else if (patch.expiry_date !== undefined && oldItem && oldItem.quantity > 0) {
     // If only expiry date changed, and we have a single batch, update it.
     // In a multi-batch world, editing "expiry_date" at item-level is ambiguous.
     // For now, we update the EARLIEST batch.
     const batches = await batchRepo.findByItemId(pool, id);
     if (batches.length > 0) {
       await batchRepo.update(pool, batches[0].id, { expiry_date: patch.expiry_date });
       await syncItemTotals(pool, id);
     }
  }

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
      const id = await itemRepo.insert(pool, {
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
      
      // Batch creation for import
      await batchRepo.insert(pool, {
        item_id: id,
        quantity: Number(row.quantity),
        expiry_date: row.expiry_date ?? null
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
