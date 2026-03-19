import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.js';
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
    <Modal onClose={onClose}>
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{item ? 'Update Inventory' : 'Add New Item'}</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Physical Stock Intelligence</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-md text-gray-400 hover:text-gray-900 transition-all flex items-center justify-center text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
          {!item && (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4 flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm border border-brand-100 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <p className="text-xs font-bold text-brand-700 leading-snug">
                {aiCategorized === false
                  ? 'Smart classification enabled. Backend syncing...'
                  : 'Leave the category blank for our AI to automatically classify your item based on its name.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            
            {/* Main Info */}
            <div className="md:col-span-2 space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Asset Name</label>
               <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Organic Almond Milk"
                className={`w-full bg-gray-50 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${errors.name ? 'border-red-200 bg-red-50/30' : 'border-transparent focus:border-brand-500'}`}
              />
              {errors.name && <p className="text-red-500 text-[10px] font-black uppercase tracking-wider mt-1 ml-1">{errors.name}</p>}
            </div>

            {/* Quantity Controls */}
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
               <input
                type="number"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className={`w-full bg-gray-50 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${errors.quantity ? 'border-red-200 bg-red-50/30' : 'border-transparent focus:border-brand-500'}`}
              />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Measurement Unit</label>
               <input
                type="text"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="kg, L, pack..."
                className={`w-full bg-gray-50 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${errors.unit ? 'border-red-200 bg-red-50/30' : 'border-transparent focus:border-brand-500'}`}
              />
            </div>

            {/* Categorization */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 appearance-none pointer-events-auto"
              >
                <option value="">{item ? 'Uncategorized' : '🤖 AI Auto-Detect'}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Timestamps */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiration</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => set('expiry_date', e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            {/* Financials */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reorder Point</label>
              <input
                type="number"
                value={form.reorder_threshold}
                onChange={(e) => set('reorder_threshold', e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cost Per Unit ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.cost_per_unit}
                onChange={(e) => set('cost_per_unit', e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            {/* Supply Chain */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier Entity</label>
               <input
                type="text"
                value={form.supplier}
                onChange={(e) => set('supplier', e.target.value)}
                placeholder="e.g. Regional Distribution Center"
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-white border-2 border-gray-100 rounded-[20px] py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all active:scale-95"
            >
              Discard Changes
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[1.5] bg-brand-600 text-white rounded-[20px] py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-200 hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting ? 'Syncing...' : item ? 'Authorize Update' : 'Initialize Asset'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
