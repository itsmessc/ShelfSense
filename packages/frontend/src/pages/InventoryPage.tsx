import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { ItemTable } from '../components/inventory/ItemTable.js';
import { ItemForm } from '../components/inventory/ItemForm.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';
import type { Item } from '../types/index.js';
import { ApiError } from '../types/index.js';

const CATEGORIES = [
  'All', 'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Other',
];

export function InventoryPage() {
  const { items, isLoading, error, fetchItems, addItem, editItem, removeItem } = useItems();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('low_stock') === 'true');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [usageTarget, setUsageTarget] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [aiCategorized, setAiCategorized] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    fetchItems({
      search: search || undefined,
      category: category !== 'All' ? category : undefined,
      low_stock: lowStockOnly || undefined,
    });
  }, [search, category, lowStockOnly, fetchItems]);

  async function handleSubmit(data: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>) {
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
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await removeItem(item.id);
    } catch {
      alert('Failed to delete item');
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); setAiCategorized(undefined); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          + Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded"
          />
          Low stock only
        </label>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{formError}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <ItemTable
            items={items}
            onEdit={(item) => { setEditTarget(item); setShowForm(true); }}
            onDelete={handleDelete}
            onLogUsage={(item) => setUsageTarget(item)}
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

      {usageTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm">
            <UsageLogForm
              items={items}
              preselectedItem={usageTarget}
              onSuccess={() => { fetchItems(); }}
              onClose={() => setUsageTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
