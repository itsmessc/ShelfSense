import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { ItemTable } from '../components/inventory/ItemTable.js';
import { ItemForm, CATEGORIES } from '../components/inventory/ItemForm.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';
import { exportItems, importItems, type ScannedItem } from '../api/client.js';
import { ShelfScanModal } from '../components/inventory/ShelfScanModal.js';
import type { Item } from '../types/index.js';
import { ApiError } from '../types/index.js';

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

export function InventoryPage() {
  const { items, isLoading, error, fetchItems, addItem, editItem, removeItem } = useItems();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [usageTarget, setUsageTarget] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [aiCategorized, setAiCategorized] = useState<boolean | undefined>(undefined);

  const [importResult, setImportResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  useEffect(() => {
    fetchItems({
      search: search || undefined,
      category: category !== 'All' ? category : undefined,
      status: status !== 'All' ? (status as 'critical' | 'warning' | 'normal') : undefined,
      sort: sortKey,
      order: sortOrder,
    });
  }, [search, category, status, sortKey, sortOrder, fetchItems]);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  async function handleSubmit(data: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>) {
    setSubmitting(true);
    setFormError('');
    try {
      if (editTarget) {
        await editItem(editTarget.id, data);
      } else {
        const res = await addItem(data);
        setAiCategorized(res.ai_categorized);
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Archive "${item.name}"? It will be hidden from inventory.`)) return;
    try { await removeItem(item.id); } catch { alert('Failed to delete item'); }
  }

  async function handleScanConfirm(scannedItems: ScannedItem[]) {
    setShowScanModal(false);
    if (scannedItems.length === 0) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const rows = scannedItems.map(s => ({
        name: s.name,
        quantity: s.estimated_quantity,
        unit: s.unit,
        reorder_threshold: 0,
      }));
      const result = await importItems(rows);
      setImportResult(result);
      if (result.inserted > 0) fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportLoading(false);
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const result = await importItems(rows);
      setImportResult(result);
      if (result.inserted > 0) fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportItems()} className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            ⬇ Export JSON
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importLoading}
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            {importLoading ? 'Importing…' : '⬆ Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <button
            onClick={() => setShowScanModal(true)}
            className="border border-brand-400 text-brand-700 px-3 py-2 rounded-lg text-sm hover:bg-brand-50 font-medium">
            📷 Scan Shelf
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); setAiCategorized(undefined); }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            + Add Item
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`rounded-lg px-4 py-3 text-sm ${importResult.errors.length === 0 ? 'bg-brand-50 border border-brand-200 text-brand-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          ✓ Imported {importResult.inserted} item{importResult.inserted !== 1 ? 's' : ''}.
          {importResult.errors.length > 0 && (
            <span> {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} failed: {importResult.errors[0].message}</span>
          )}
          <button onClick={() => setImportResult(null)} className="ml-2 underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-52" />

        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option>All</option>
          <option value="critical">🔴 Critical</option>
          <option value="warning">🟡 Warning</option>
          <option value="normal">🟢 Normal</option>
        </select>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{formError}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <ItemTable
            items={items}
            onEdit={(item) => { setEditTarget(item); setShowForm(true); }}
            onDelete={handleDelete}
            onLogUsage={(item) => setUsageTarget(item)}
            onViewDetail={(item) => navigate(`/inventory/${item.id}`)}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>

      {showForm && (
        <ItemForm
          item={editTarget}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          isSubmitting={submitting}
          aiCategorized={aiCategorized}
        />
      )}

      {showScanModal && (
        <ShelfScanModal
          onConfirm={handleScanConfirm}
          onClose={() => setShowScanModal(false)}
        />
      )}

      {usageTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm">
            <UsageLogForm
              items={items}
              preselectedItem={usageTarget}
              onSuccess={() => { fetchItems(); setUsageTarget(null); }}
              onClose={() => setUsageTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
