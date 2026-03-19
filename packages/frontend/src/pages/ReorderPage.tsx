import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReorderQueue, updateItem, type ReorderItem } from '../api/client.js';

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

// --- Receiving Modal ---
function ReceivingModal({ 
  item, 
  onConfirm, 
  onClose,
  isSubmitting 
}: { 
  item: ReorderItem; 
  onConfirm: (qty: number, expiry: string | null) => void; 
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [qty, setQty] = useState(item.suggested_order_qty || 1);
  const [expiry, setExpiry] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-tight">Receive Stock</h2>
            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-0.5">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors text-xl">✕</button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity Received ({item.unit})</label>
            <input 
              type="number" 
              value={qty} 
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-900 focus:border-brand-500 focus:bg-white transition-all outline-none"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Batch Expiry Date (Optional)</label>
            <input 
              type="date" 
              value={expiry} 
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-900 focus:border-brand-500 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 bg-white border-2 border-gray-100 rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(qty, expiry || null)}
            disabled={isSubmitting || qty <= 0}
            className="flex-2 bg-brand-600 text-white rounded-2xl py-3.5 px-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(items: ReorderItem[]) {
  // ... (previous implementation remains same)
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
  
  const [receivingItem, setReceivingItem] = useState<ReorderItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Persistence Logic ---
  useEffect(() => {
    const saved = localStorage.getItem('shelfsense_checked_reorders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setChecked(new Set(parsed));
      } catch (e) { console.error('Failed to load checked states'); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shelfsense_checked_reorders', JSON.stringify([...checked]));
  }, [checked]);

  const fetchData = () => {
    setLoading(true);
    getReorderQueue()
      .then((res) => {
        setItems(res.items);
        setTotalCost(res.total_estimated_cost);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleReceive(qty: number, expiry: string | null) {
    if (!receivingItem) return;
    setIsUpdating(true);
    try {
      const newQty = receivingItem.current_quantity + qty;
      await updateItem(receivingItem.id, { 
        quantity: newQty,
        expiry_date: expiry 
      });
      setReceivingItem(null);
      fetchData(); // Refresh list
    } catch (err) {
      alert('Failed to update stock quantity');
    } finally {
      setIsUpdating(false);
    }
  }

  const pending = items.filter((i) => !checked.has(i.id));
  const ordered = items.filter((i) => checked.has(i.id));

  if (loading && items.length === 0) return <div className="p-8 text-gray-400">Loading reorder queue…</div>;
  if (error)   return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reorder Queue</h1>
          <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">
            Auto-generated critical & warning stock levels
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(items)}
            disabled={items.length === 0}
            className="bg-white border-2 border-gray-100 rounded-2xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:border-gray-200 transition-all disabled:opacity-40 shadow-sm"
          >
            ⬇ Export Shopping List
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🎉</div>
          <h2 className="text-xl font-black text-gray-900">All items well stocked!</h2>
          <p className="text-sm font-medium text-gray-400 mt-2">Check back later for automated reorder suggestions.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Reorders', val: items.length, icon: '📋' },
              { label: 'Critical', val: items.filter(i => i.alert_status === 'critical').length, icon: '🔴', cls: 'text-red-600' },
              { label: 'Warning', val: items.filter(i => i.alert_status === 'warning').length, icon: '🟡', cls: 'text-amber-600' },
              { label: 'Est. Total', val: totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—', icon: '💰', cls: 'text-brand-700', bg: 'bg-brand-50 border-brand-100' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 text-center transition-transform hover:-translate-y-1 ${stat.bg || ''}`}>
                <p className={`text-2xl font-black ${stat.cls || 'text-gray-900'}`}>{stat.val}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Pending items */}
          {pending.length > 0 && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
              <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To Order ({pending.length})</h2>
              </div>
              <div className="p-4 space-y-3">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-5 rounded-[24px] border-2 p-5 transition-all group ${STATUS_CLS[item.alert_status ?? 'normal']}`}
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggle(item.id)}
                      className="w-5 h-5 accent-brand-600 shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link to={`/inventory/${item.id}`} className="text-sm font-black text-gray-900 hover:text-brand-600 transition-colors">
                          {item.name}
                        </Link>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${STATUS_BADGE[item.alert_status ?? 'normal']}`}>
                          {item.alert_status}
                        </span>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">{item.category}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-[11px] font-medium text-gray-500">
                        <span>Stock: <strong className="text-gray-900">{item.current_quantity} / {item.reorder_threshold} {item.unit}</strong></span>
                        {item.days_until_stockout != null && (
                          <span>Runs out in: <strong className="text-red-500">{item.days_until_stockout}d</strong></span>
                        )}
                        {item.supplier && <span className="flex items-center gap-1.5"><span className="opacity-50 text-base">🏢</span> {item.supplier}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.suggested_order_qty != null && (
                        <p className="text-sm font-black text-gray-900">
                          +{item.suggested_order_qty} {item.unit} suggested
                        </p>
                      )}
                      {item.estimated_cost != null && (
                        <p className="text-xs text-brand-700 font-black mt-0.5">${item.estimated_cost.toFixed(2)} total</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                       <Link
                        to="/procurement"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                      >
                        <span>🌱</span> Find eco supplier
                      </Link>
                      <button 
                        onClick={() => setReceivingItem(item)}
                        className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all opacity-0 group-hover:opacity-100"
                      >
                        Receive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ordered items */}
          {ordered.length > 0 && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden opacity-60">
              <div className="px-8 py-4 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">✓ Ordered ({ordered.length})</h2>
              </div>
              <div className="p-4 space-y-2">
                {ordered.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 text-xs font-bold text-gray-500 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-4 transition-colors group">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggle(item.id)}
                      className="w-4 h-4 accent-brand-600 cursor-pointer"
                    />
                    <span className="line-through flex-1">{item.name} <span className="text-gray-300 ml-2 font-medium">({item.suggested_order_qty} {item.unit})</span></span>
                    
                    <button 
                      onClick={() => setReceivingItem(item)}
                      className="bg-brand-50 text-brand-600 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Process Fulfillment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Receiving Modal */}
      {receivingItem && (
        <ReceivingModal 
          item={receivingItem}
          onClose={() => setReceivingItem(null)}
          onConfirm={handleReceive}
          isSubmitting={isUpdating}
        />
      )}
    </div>
  );
}
