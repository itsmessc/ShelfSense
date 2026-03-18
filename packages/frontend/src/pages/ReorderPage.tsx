import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReorderQueue, type ReorderItem } from '../api/client.js';

const STATUS_CLS: Record<string, string> = {
  critical: 'bg-red-50 border-red-200',
  warning:  'bg-amber-50 border-amber-200',
  normal:   'bg-white border-gray-200',
};
const STATUS_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  warning:  'bg-amber-100 text-amber-700',
  normal:   'bg-green-100 text-green-700',
};

function exportCSV(items: ReorderItem[]) {
  const rows = [
    ['Name', 'Category', 'Current Qty', 'Unit', 'Reorder Qty', 'Cost/Unit', 'Est. Cost', 'Supplier', 'Days Left', 'Reorder By'],
    ...items.map((i) => [
      i.name, i.category, i.current_quantity, i.unit,
      i.suggested_order_qty ?? '', i.cost_per_unit ?? '',
      i.estimated_cost ?? '', i.supplier ?? '',
      i.days_until_stockout ?? '', i.reorder_date ?? '',
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shelfsense-reorder-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReorderPage() {
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    getReorderQueue()
      .then((res) => {
        setItems(res.items);
        setTotalCost(res.total_estimated_cost);
        setChecked(new Set());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const pending = items.filter((i) => !checked.has(i.id));
  const ordered = items.filter((i) => checked.has(i.id));

  if (loading) return <div className="p-8 text-gray-400">Loading reorder queue…</div>;
  if (error)   return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Reorder Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-generated from critical &amp; warning stock levels. Check off items as you order them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(items)}
            disabled={items.length === 0}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            ⬇ Export Shopping List
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-semibold text-green-700">All items are well stocked!</p>
          <p className="text-sm text-green-600 mt-1">No reorders needed right now.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Items to reorder</p>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{items.filter((i) => i.alert_status === 'critical').length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Critical</p>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{items.filter((i) => i.alert_status === 'warning').length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Warning</p>
            </div>
            <div className="bg-brand-50 rounded-2xl border border-brand-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-brand-700">
                {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">Est. total cost</p>
            </div>
          </div>

          {/* Pending items */}
          {pending.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                To Order ({pending.length})
              </h2>
              {pending.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${STATUS_CLS[item.alert_status ?? 'normal']}`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 accent-brand-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/inventory/${item.id}`} className="font-semibold text-gray-900 hover:underline text-sm">
                        {item.name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.alert_status ?? 'normal']}`}>
                        {item.alert_status}
                      </span>
                      <span className="text-xs text-gray-400">{item.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                      <span>Stock: <strong>{item.current_quantity} / {item.reorder_threshold} {item.unit}</strong></span>
                      {item.days_until_stockout != null && (
                        <span>Runs out in: <strong className="text-red-600">{item.days_until_stockout}d</strong></span>
                      )}
                      {item.reorder_date && (
                        <span>Order by: <strong>{item.reorder_date}</strong></span>
                      )}
                      {item.supplier && <span>Supplier: {item.supplier}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {item.suggested_order_qty != null && (
                      <p className="font-semibold text-gray-800 text-sm">
                        Order {item.suggested_order_qty} {item.unit}
                      </p>
                    )}
                    {item.estimated_cost != null && (
                      <p className="text-xs text-brand-700 font-medium">${item.estimated_cost.toFixed(2)}</p>
                    )}
                    {item.cost_per_unit != null && (
                      <p className="text-xs text-gray-400">${item.cost_per_unit.toFixed(2)}/{item.unit}</p>
                    )}
                  </div>
                  <Link
                    to="/procurement"
                    className="text-xs text-brand-600 hover:underline shrink-0 hidden sm:block"
                  >
                    🌱 Find eco supplier
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Ordered items */}
          {ordered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-2 opacity-60">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                ✓ Ordered ({ordered.length})
              </h2>
              {ordered.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm text-gray-400 py-1">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 accent-brand-600"
                  />
                  <span className="line-through">{item.name}</span>
                  {item.suggested_order_qty != null && (
                    <span className="text-xs">({item.suggested_order_qty} {item.unit})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
