import { useState, useEffect } from 'react';
import type { Item } from '../../types/index.js';

const CATEGORIES = [
  'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Other',
];

interface Props {
  item?: Item | null;
  onSubmit: (data: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  aiCategorized?: boolean;
}

export function ItemForm({ item, onSubmit, onClose, isSubmitting, aiCategorized }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    quantity: item?.quantity?.toString() ?? '',
    unit: item?.unit ?? '',
    category: item?.category ?? '',
    expiry_date: item?.expiry_date ?? '',
    reorder_threshold: item?.reorder_threshold?.toString() ?? '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        quantity: item.quantity.toString(),
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiry_date ?? '',
        reorder_threshold: item.reorder_threshold.toString(),
      });
    }
  }, [item]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      errs.quantity = 'Quantity must be a non-negative number';
    if (!form.unit.trim()) errs.unit = 'Unit is required';
    if (form.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.expiry_date))
      errs.expiry_date = 'Use YYYY-MM-DD format';
    if (isNaN(Number(form.reorder_threshold)) || Number(form.reorder_threshold) < 0)
      errs.reorder_threshold = 'Must be a non-negative number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: form.name.trim(),
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      category: form.category || 'Uncategorized',
      expiry_date: form.expiry_date || null,
      reorder_threshold: Number(form.reorder_threshold),
    });
  }

  function field(label: string, key: keyof typeof form, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            errors[key] ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {!item && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-sm text-brand-700">
              {aiCategorized === false
                ? '⚡ Category set by smart rules (AI unavailable)'
                : '🤖 AI will auto-categorize this item'}
            </div>
          )}

          {field('Item Name *', 'name', 'text', 'e.g. Organic Oats')}

          <div className="grid grid-cols-2 gap-3">
            {field('Quantity *', 'quantity', 'number', '0')}
            {field('Unit *', 'unit', 'text', 'kg, L, cans...')}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category {!item && <span className="text-gray-400 text-xs">(leave blank for AI)</span>}
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Auto-detect</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {field('Expiry Date', 'expiry_date', 'date')}
          {field('Reorder Threshold', 'reorder_threshold', 'number', '0')}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
