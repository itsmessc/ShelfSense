import { useState, useEffect } from 'react';
import type { Item } from '../../types/index.js';

export const CATEGORIES = [
  'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Lab & Equipment', 'Chemicals',
  'Office Supplies', 'Other',
];

interface Props {
  item?: Item | null;
  onSubmit: (data: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  aiCategorized?: boolean;
}

type FormState = {
  name: string; quantity: string; unit: string; category: string;
  expiry_date: string; reorder_threshold: string;
  cost_per_unit: string; supplier: string; purchase_date: string;
};

const empty: FormState = {
  name: '', quantity: '', unit: '', category: '', expiry_date: '',
  reorder_threshold: '0', cost_per_unit: '', supplier: '', purchase_date: '',
};

export function ItemForm({ item, onSubmit, onClose, isSubmitting, aiCategorized }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        quantity: item.quantity.toString(),
        unit: item.unit,
        category: item.category,
        expiry_date: item.expiry_date ?? '',
        reorder_threshold: item.reorder_threshold.toString(),
        cost_per_unit: item.cost_per_unit?.toString() ?? '',
        supplier: item.supplier ?? '',
        purchase_date: item.purchase_date ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [item]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      errs.quantity = 'Must be ≥ 0';
    if (!form.unit.trim()) errs.unit = 'Unit is required';
    if (form.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.expiry_date))
      errs.expiry_date = 'Use YYYY-MM-DD';
    if (form.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.purchase_date))
      errs.purchase_date = 'Use YYYY-MM-DD';
    if (isNaN(Number(form.reorder_threshold)) || Number(form.reorder_threshold) < 0)
      errs.reorder_threshold = 'Must be ≥ 0';
    if (form.cost_per_unit && isNaN(Number(form.cost_per_unit)))
      errs.cost_per_unit = 'Must be a number';
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
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      supplier: form.supplier.trim() || null,
      purchase_date: form.purchase_date || null,
    });
  }

  function field(label: string, key: keyof FormState, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors[key] ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors[key] && <p className="text-red-500 text-xs mt-0.5">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {!item && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-xs text-brand-700">
              {aiCategorized === false
                ? '⚡ Category set by smart rules (AI unavailable)'
                : '🤖 Leave category blank for AI auto-detection'}
            </div>
          )}

          {/* Row 1 */}
          {field('Item Name *', 'name', 'text', 'e.g. Organic Oats')}

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            {field('Quantity *', 'quantity', 'number', '0')}
            {field('Unit *', 'unit', 'text', 'kg, L, cans…')}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category {!item && <span className="text-gray-400">(blank = AI detects)</span>}
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Auto-detect</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            {field('Expiry Date', 'expiry_date', 'date')}
            {field('Purchase Date', 'purchase_date', 'date')}
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-3">
            {field('Reorder Threshold', 'reorder_threshold', 'number', '0')}
            {field('Cost per Unit ($)', 'cost_per_unit', 'number', '0.00')}
          </div>

          {/* Supplier */}
          {field('Supplier', 'supplier', 'text', 'e.g. Green Harvest Co.')}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {isSubmitting ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
