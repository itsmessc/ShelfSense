import { useState, useEffect } from 'react';
import type { Item } from '../../types/index.js';
import { logUsage } from '../../api/client.js';

interface Props {
  items: Item[];
  preselectedItem?: Item | null;
  onSuccess: () => void;
  onClose?: () => void;
}

export function UsageLogForm({ items, preselectedItem, onSuccess, onClose }: Props) {
  const [itemId, setItemId] = useState<string>(preselectedItem?.id?.toString() ?? '');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (preselectedItem) setItemId(preselectedItem.id.toString());
  }, [preselectedItem]);

  const selectedItem = items.find((i) => i.id.toString() === itemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!itemId) return setError('Please select an item');
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0)
      return setError('Enter a valid positive quantity');

    setSubmitting(true);
    try {
      await logUsage({ item_id: Number(itemId), quantity_used: Number(quantity), notes: notes || undefined });
      setSuccess(true);
      setQuantity('');
      setNotes('');
      onSuccess();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log usage');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-2xl border border-gray-100 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Log Asset Usage</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time inventory decrement</p>
        </div>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all flex items-center justify-center text-2xl"
          >
            &times;
          </button>
        )}
      </div>

      <div className="space-y-4">
        {success && (
          <div className="bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4 flex items-center gap-4 animate-in zoom-in duration-200">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm shadow-sm border border-brand-200">
              ✓
            </div>
            <p className="text-xs font-bold text-brand-700">Transaction authorized and synced.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-4 animate-in zoom-in duration-200">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm shadow-sm border border-red-200">
               ⚠️
            </div>
            <p className="text-xs font-bold text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Asset</label>
          <div className="relative">
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 appearance-none pointer-events-auto"
            >
              <option value="">Choose an inventory item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({Number(i.quantity)} {i.unit} available)
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
               ↓
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Quantity Consumed {selectedItem && <span className="text-brand-600 ml-1">({selectedItem.unit})</span>}
            </label>
            <input
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Internal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Daily prep, Spill..."
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-600 text-white rounded-[20px] py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-200 hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <span className="text-lg">📉</span> Confirm Usage Log
          </>
        )}
      </button>
    </form>
  );
}
