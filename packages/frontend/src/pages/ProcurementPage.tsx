import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { getSupplierSuggestions } from '../api/client.js';
import { SupplierCard } from '../components/procurement/SupplierCard.js';
import type { Item, SupplierSuggestion } from '../types/index.js';

const STATUS_CLS: Record<string, string> = {
  critical: 'border-red-300 bg-red-50',
  warning:  'border-amber-300 bg-amber-50',
  normal:   'border-gray-200 bg-white',
};
const STATUS_DOT: Record<string, string> = {
  critical: 'bg-red-500', warning: 'bg-amber-400', normal: 'bg-green-500',
};

export function ProcurementPage() {
  const { items, fetchItems } = useItems();
  const [selected, setSelected] = useState<Item | null>(null);
  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems({ sort: 'name', order: 'asc' }); }, [fetchItems]);

  async function selectItem(item: Item) {
    setSelected(item);
    setSuggestions([]);
    setError('');
    setLoading(true);
    try {
      const res = await getSupplierSuggestions(item.id);
      setSuggestions(res.suggestions);
      setAiGenerated(res.ai_generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...items]
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, normal: 2 };
      return (order[a.alert_status ?? 'normal'] ?? 2) - (order[b.alert_status ?? 'normal'] ?? 2);
    });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Hub</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find eco-friendly suppliers — AI ranks by sustainability score, cost, and local sourcing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item list */}
        <div className="lg:col-span-1 space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium px-1">
            Select an item to find suppliers
          </p>
          <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {sorted.map(item => {
              const s = item.alert_status ?? 'normal';
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${STATUS_CLS[s]} ${isSelected ? 'ring-2 ring-brand-500' : 'hover:shadow-sm'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                    <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1 pl-4">
                    <span>{item.category}</span>
                    <span>{Number(item.quantity)} {item.unit}</span>
                  </div>
                  {item.supplier && (
                    <p className="text-xs text-gray-400 pl-4 mt-0.5 truncate">Current: {item.supplier}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Supplier suggestions panel */}
        <div className="lg:col-span-2">
          {!selected && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 rounded-2xl border-2 border-dashed">
              <span className="text-4xl mb-3">🌱</span>
              <p className="font-medium">Select an item from the list</p>
              <p className="text-sm mt-1">We'll find the best eco-friendly suppliers</p>
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">{selected.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selected.category} · {Number(selected.quantity)} {selected.unit} remaining
                    {selected.cost_per_unit != null && ` · Current cost $${Number(selected.cost_per_unit).toFixed(2)}/${selected.unit}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {suggestions.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${aiGenerated ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {aiGenerated ? '🤖 AI-ranked' : '⚡ Algorithm-ranked'}
                    </span>
                  )}
                  <Link
                    to={`/inventory/${selected.id}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    View full details →
                  </Link>
                </div>
              </div>

              {loading && (
                <div className="text-center py-12 text-gray-400">Finding best suppliers…</div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {suggestions.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {suggestions.map((s, i) => (
                      <SupplierCard key={s.id} supplier={s} rank={i + 1} />
                    ))}
                  </div>

                  {/* Cost comparison table */}
                  <div className="bg-white rounded-2xl shadow-sm border p-5">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                      Cost &amp; Carbon Comparison
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase border-b">
                          <th className="pb-2 text-left font-medium">Supplier</th>
                          <th className="pb-2 text-right font-medium">Price/{selected.unit}</th>
                          <th className="pb-2 text-right font-medium">CO₂ kg</th>
                          <th className="pb-2 text-right font-medium">Delivery</th>
                          <th className="pb-2 text-right font-medium">Eco Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selected.supplier && selected.cost_per_unit != null && (
                          <tr className="text-gray-400 text-xs">
                            <td className="py-2">{selected.supplier} <span className="text-gray-300">(current)</span></td>
                            <td className="py-2 text-right">${Number(selected.cost_per_unit).toFixed(2)}</td>
                            <td className="py-2 text-right">—</td>
                            <td className="py-2 text-right">—</td>
                            <td className="py-2 text-right">—</td>
                          </tr>
                        )}
                        {suggestions.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="py-2 font-medium text-gray-800">
                              {s.name}
                              {s.is_local && <span className="ml-1 text-xs text-green-600">(local)</span>}
                            </td>
                            <td className="py-2 text-right">
                              ${s.price_per_unit.toFixed(2)}
                              {s.cost_diff_pct != null && (
                                <span className={`ml-1 text-xs ${s.cost_comparison === 'cheaper' ? 'text-green-600' : s.cost_comparison === 'more_expensive' ? 'text-red-500' : 'text-gray-400'}`}>
                                  ({s.cost_diff_pct > 0 ? '+' : ''}{s.cost_diff_pct}%)
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right">{s.carbon_footprint_kg}</td>
                            <td className="py-2 text-right">{s.delivery_days}d</td>
                            <td className="py-2 text-right">
                              <span className={`font-semibold ${s.sustainability_score >= 75 ? 'text-green-600' : s.sustainability_score >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                                {s.sustainability_score}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
