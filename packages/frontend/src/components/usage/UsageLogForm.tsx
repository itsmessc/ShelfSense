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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Log Usage</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        )}
      </div>

      {success && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-sm text-brand-700">
          ✓ Usage logged successfully
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select an item...</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({Number(i.quantity)} {i.unit} remaining)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity Used *{selectedItem && <span className="text-gray-400 text-xs ml-1">({selectedItem.unit})</span>}
        </label>
        <input
          type="number"
          min="0.001"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Logging...' : 'Log Usage'}
      </button>
    </form>
  );
}
