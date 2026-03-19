import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';
import { getRecentLogs } from '../api/usage.js';
import { batchLogUsage } from '../api/usage.js';
import type { Item } from '../types/index.js';

type RecentLog = {
  id: number; item_id: number; quantity_used: number;
  logged_at: string; notes: string | null; item_name: string; unit: string;
};

type BatchRow = { item_id: number; quantity_used: string; notes: string };

// ── Batch Log Form ────────────────────────────────────────────────────────────

function BatchLogForm({ items, onSuccess }: { items: Item[]; onSuccess: () => void }) {
  const [rows, setRows] = useState<BatchRow[]>([{ item_id: 0, quantity_used: '', notes: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ logged: number; errors: Array<{ index: number; message: string }> } | null>(null);

  function addRow() {
    setRows((prev) => [...prev, { item_id: 0, quantity_used: '', notes: '' }]);
  }

  function updateRow(i: number, field: keyof BatchRow, value: string | number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = rows.filter((r) => r.item_id > 0 && Number(r.quantity_used) > 0);
    if (valid.length === 0) { alert('Add at least one valid entry.'); return; }
    setSubmitting(true);
    try {
      const res = await batchLogUsage(valid.map((r) => ({
        item_id: r.item_id,
        quantity_used: Number(r.quantity_used),
        notes: r.notes || undefined,
      })));
      setResult(res);
      if (res.logged > 0) {
        setRows([{ item_id: 0, quantity_used: '', notes: '' }]);
        onSuccess();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Batch Usage Log</h2>
        <span className="text-xs text-gray-400">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {result && (
        <div className={`rounded-lg px-3 py-2 text-sm ${result.errors.length === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          ✓ Logged {result.logged} entr{result.logged === 1 ? 'y' : 'ies'}.
          {result.errors.length > 0 && <span> {result.errors.length} failed.</span>}
          <button onClick={() => setResult(null)} className="ml-2 underline text-xs">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
              <div className="flex-1 space-y-2">
                <select
                  value={row.item_id}
                  onChange={(e) => updateRow(i, 'item_id', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value={0}>Select item…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({Number(item.quantity)} {item.unit} left)
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number" min="0.001" step="any"
                    placeholder="Qty used"
                    value={row.quantity_used}
                    onChange={(e) => updateRow(i, 'quantity_used', e.target.value)}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={row.notes}
                    onChange={(e) => updateRow(i, 'notes', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <button type="button" onClick={() => removeRow(i)}
                className="text-gray-400 hover:text-red-500 mt-1 shrink-0">✕</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors">
          + Add row
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Logging…' : `Log ${rows.filter((r) => r.item_id > 0 && Number(r.quantity_used) > 0).length || rows.length} Entries`}
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function UsagePage() {
  const { items, fetchItems } = useItems();
  const [logs, setLogs]             = useState<RecentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [tab, setTab]               = useState<'single' | 'batch'>('single');

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function loadLogs() {
    setLoadingLogs(true);
    getRecentLogs()
      .then((res) => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }
  useEffect(() => { loadLogs(); }, []);

  function handleSuccess() { fetchItems(); loadLogs(); }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Record consumption to enable AI forecasting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: forms */}
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('single')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'single' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Single Entry
            </button>
            <button
              onClick={() => setTab('batch')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'batch' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Batch Log
            </button>
          </div>

          {tab === 'single' ? (
            <>
              <UsageLogForm items={items} onSuccess={handleSuccess} />
              <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-brand-800 mb-2">How forecasting works</h3>
                <ul className="text-sm text-brand-700 space-y-1 list-disc list-inside">
                  <li>Log usage regularly to build a history</li>
                  <li>AI analyzes your patterns and predicts stockouts</li>
                  <li>View forecasts on each item's detail page</li>
                  <li>Falls back to math-based forecast if AI is unavailable</li>
                </ul>
              </div>
            </>
          ) : (
            <BatchLogForm items={items} onSuccess={handleSuccess} />
          )}
        </div>

        {/* Right: recent logs */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Usage Logs</h2>
          {loadingLogs ? (
            <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center">
              No usage logged yet. Use the form to record your first entry.
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <Link to={`/inventory/${log.item_id}`}
                      className="font-medium text-gray-800 hover:text-brand-600 truncate block">
                      {log.item_name}
                    </Link>
                    {log.notes && (
                      <span className="text-xs text-gray-400 truncate block">{log.notes}</span>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className="font-semibold text-gray-700">
                      −{Number(log.quantity_used)} {log.unit}
                    </span>
                    <p className="text-xs text-gray-400">{new Date(log.logged_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
