import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { ItemTable } from '../components/inventory/ItemTable.js';
import { ItemForm, CATEGORIES } from '../components/inventory/ItemForm.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';
import { exportItems, importItems, type ScannedItem } from '../api/client.js';
import { ShelfScanModal } from '../components/inventory/ShelfScanModal.js';
import { Modal } from '../components/common/Modal.js';
import type { Item } from '../types/index.js';
import { ApiError } from '../types/index.js';

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      // handle quoted values
      const vals: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      vals.push(cur.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    });
}

function exportCSVTemplate() {
  const header = 'name,quantity,unit,category,expiry_date,reorder_threshold,cost_per_unit,supplier,purchase_date';
  const sample = 'Oat Milk,10,L,Dairy Alternatives,2025-06-30,2,1.50,EcoFarm,2025-01-01';
  const blob   = new Blob([`${header}\n${sample}\n`], { type: 'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = 'shelfsense-template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Preview Modal ─────────────────────────────────────────────────────────

function CSVPreviewModal({
  rows,
  onConfirm,
  onCancel,
  importing,
}: {
  rows: Array<Record<string, string>>;
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}) {
  const preview = rows.slice(0, 8);
  const cols    = Object.keys(rows[0] ?? {}).slice(0, 6);
  return (
    <Modal onClose={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">CSV Preview</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Found <strong>{rows.length}</strong> rows. Showing first {preview.length}.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-semibold text-gray-600 uppercase">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{row[c] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={importing}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
          >
            {importing ? 'Importing…' : `Import ${rows.length} Items`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { items, isLoading, error, fetchItems, addItem, editItem, removeItem } = useItems();
  const navigate  = useNavigate();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('All');
  const [status,    setStatus]    = useState('All');
  const [sortKey,   setSortKey]   = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm,      setShowForm]      = useState(false);
  const [editTarget,    setEditTarget]    = useState<Item | null>(null);
  const [usageTarget,   setUsageTarget]   = useState<Item | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [formError,     setFormError]     = useState('');
  const [aiCategorized, setAiCategorized] = useState<boolean | undefined>(undefined);

  const [importResult,  setImportResult]  = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [csvRows,       setCsvRows]       = useState<Array<Record<string, string>> | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchItems({
      search:    search || undefined,
      category:  category !== 'All' ? category : undefined,
      status:    status !== 'All' ? (status as 'critical' | 'warning' | 'normal') : undefined,
      sort:      sortKey,
      order:     sortOrder,
    });
  }, [search, category, status, sortKey, sortOrder, fetchItems]);

  function handleSort(key: string) {
    if (key === sortKey) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder('asc'); }
  }

  async function handleSubmit(data: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>) {
    setSubmitting(true); setFormError('');
    try {
      if (editTarget) { await editItem(editTarget.id, data); }
      else            { const res = await addItem(data); setAiCategorized(res.ai_categorized); }
      setShowForm(false); setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save item');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Archive "${item.name}"? It will be hidden from inventory.`)) return;
    try { await removeItem(item.id); } catch { alert('Failed to delete item'); }
  }

  async function handleScanConfirm(scannedItems: ScannedItem[]) {
    setShowScanModal(false);
    if (scannedItems.length === 0) return;
    setImportLoading(true); setImportResult(null);
    try {
      const rows = scannedItems.map(s => ({ name: s.name, quantity: s.estimated_quantity, unit: s.unit, reorder_threshold: 0, expiry_date: s.expiry_date ?? null }));
      const result = await importItems(rows);
      setImportResult(result);
      if (result.inserted > 0) fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally { setImportLoading(false); }
  }

  async function handleCSVFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { alert('No valid rows found in CSV.'); return; }
      setCsvRows(rows);
    } catch { alert('Failed to parse CSV.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleCSVConfirm() {
    if (!csvRows) return;
    setImportLoading(true);
    try {
      const result = await importItems(csvRows);
      setImportResult(result);
      if (result.inserted > 0) fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally { setImportLoading(false); setCsvRows(null); }
  }

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(allIds: number[]) {
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else             setSelectedIds(new Set(allIds));
  }

  async function handleBulkDelete() {
    if (!confirm(`Archive ${selectedIds.size} selected item(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => removeItem(id)));
      setSelectedIds(new Set());
    } finally { setBulkDeleting(false); }
  }

  function handleBulkExport() {
    const selected = items.filter((i) => selectedIds.has(i.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `shelfsense-selected-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Inventory</h1>
          <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            {items.length} active item{items.length !== 1 ? 's' : ''} in stock
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex bg-white rounded-xl shadow-sm border p-1">
            <button onClick={() => exportCSVTemplate()} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              📄 Template
            </button>
            <div className="w-px h-4 my-auto bg-gray-200" />
            <button onClick={() => exportItems()} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              ⬇ Export
            </button>
            <div className="w-px h-4 my-auto bg-gray-200" />
            <button onClick={() => fileRef.current?.click()} disabled={importLoading}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
              {importLoading ? 'Importing…' : '⬆ Import'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFileSelect} />
          
          <button onClick={() => setShowScanModal(true)}
            className="bg-white border border-brand-200 text-brand-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-50 transition-all shadow-sm flex items-center gap-2">
            <span>📷</span> Scan Shelf
          </button>
          
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); setAiCategorized(undefined); }}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center gap-2">
            <span>+</span> Add Item
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`rounded-2xl px-6 py-4 text-sm font-medium shadow-sm border ${importResult.errors.length === 0 ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{importResult.errors.length === 0 ? '✅' : '⚠️'}</span>
              <span>
                Imported <strong>{importResult.inserted}</strong> item{importResult.inserted !== 1 ? 's' : ''}.
                {importResult.errors.length > 0 && (
                  <span className="ml-1 opacity-80">({importResult.errors.length} failed: {importResult.errors[0].message})</span>
                )}
              </span>
            </div>
            <button onClick={() => setImportResult(null)} className="text-xs font-bold hover:underline opacity-60">Dismiss</button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, supplier or category…"
            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-all" />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-2">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer min-w-[140px]">
            <option>All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-2">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer min-w-[140px]">
            <option>All</option>
            <option value="critical">🔴 Critical</option>
            <option value="warning">🟡 Warning</option>
            <option value="normal">🟢 Normal</option>
          </select>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-3 text-sm font-bold text-red-700 shadow-sm flex items-center gap-3">
          <span>❌</span> {formError}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-400 animate-pulse">Fetching inventory...</p>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <span className="text-4xl">😵</span>
            <p className="text-red-500 font-bold mt-4">{error}</p>
            <button onClick={() => fetchItems()} className="mt-4 text-brand-600 font-bold text-sm hover:underline">Try Again</button>
          </div>
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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
          />
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-gray-600" />
          <button onClick={handleBulkExport} className="text-sm hover:text-green-300 font-medium">⬇ Export</button>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="text-sm text-red-400 hover:text-red-300 font-medium disabled:opacity-50">
            {bulkDeleting ? 'Deleting…' : '🗑 Delete'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-400 hover:text-white">✕ Clear</button>
        </div>
      )}

      {/* CSV Preview Modal */}
      {csvRows && (
        <CSVPreviewModal
          rows={csvRows}
          onConfirm={handleCSVConfirm}
          onCancel={() => setCsvRows(null)}
          importing={importLoading}
        />
      )}

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
        <ShelfScanModal onConfirm={handleScanConfirm} onClose={() => setShowScanModal(false)} />
      )}

      {usageTarget && (
        <Modal onClose={() => setUsageTarget(null)}>
          <div className="w-full max-w-sm">
            <UsageLogForm
              items={items}
              preselectedItem={usageTarget}
              onSuccess={() => { fetchItems(); setUsageTarget(null); }}
              onClose={() => setUsageTarget(null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
