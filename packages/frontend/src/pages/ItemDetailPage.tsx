import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getItem, generateForecast, getUsageHistory, getSupplierSuggestions } from '../api/client.js';
import { ForecastCard } from '../components/forecast/ForecastCard.js';
import { SupplierCard } from '../components/procurement/SupplierCard.js';
import { UsageChart } from '../components/usage/UsageChart.js';
import type { Item, ForecastResult, UsageHistory, SupplierSuggestion } from '../types/index.js';

const STATUS_CLS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  warning:  'bg-amber-100 text-amber-700',
  normal:   'bg-green-100 text-green-700',
};

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [usage, setUsage] = useState<UsageHistory | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierSuggestion[]>([]);
  const [aiSuppliers, setAiSuppliers] = useState(false);

  const [loadingItem, setLoadingItem] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id);
    setLoadingItem(true);
    Promise.all([getItem(numId), getUsageHistory(numId)])
      .then(([itemRes, usageRes]) => {
        setItem(itemRes.data);
        setUsage(usageRes);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingItem(false));
  }, [id]);

  function handleGenerateForecast() {
    if (!id) return;
    setLoadingForecast(true);
    setForecastError('');
    generateForecast(parseInt(id))
      .then(res => setForecast(res.data))
      .catch(e => setForecastError(e.message))
      .finally(() => setLoadingForecast(false));
  }

  function handleLoadSuppliers() {
    if (!id) return;
    setLoadingSuppliers(true);
    setSupplierError('');
    getSupplierSuggestions(parseInt(id))
      .then(res => { setSuppliers(res.suggestions); setAiSuppliers(res.ai_generated); })
      .catch(e => setSupplierError(e.message))
      .finally(() => setLoadingSuppliers(false));
  }

  if (loadingItem) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error)       return <div className="p-8 text-red-500">{error}</div>;
  if (!item)       return <div className="p-8 text-gray-400">Item not found.</div>;

  const status = item.alert_status ?? 'normal';
  const costEstimate =
    forecast?.recommended_reorder_quantity != null && item.cost_per_unit != null
      ? (forecast.recommended_reorder_quantity * Number(item.cost_per_unit)).toFixed(2)
      : null;

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 mt-1 text-lg">←</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{item.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{item.category}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Last updated {new Date(item.updated_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Top grid: details + usage history ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Item details */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-2.5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Item Details</h2>
          {([
            ['Quantity',          `${Number(item.quantity)} ${item.unit}`],
            ['Reorder Threshold', item.reorder_threshold ? `${Number(item.reorder_threshold)} ${item.unit}` : '—'],
            ['Cost per Unit',     item.cost_per_unit != null ? `$${Number(item.cost_per_unit).toFixed(2)}` : '—'],
            ['Supplier',          item.supplier ?? '—'],
            ['Expiry Date',       item.expiry_date ?? '—'],
            ['Purchase Date',     item.purchase_date ?? '—'],
            ['Added',             new Date(item.created_at).toLocaleDateString()],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        {/* Usage history + chart */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Usage History</h2>
            {usage?.average_daily_usage != null && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                avg {usage.average_daily_usage} {item.unit}/day
              </span>
            )}
          </div>

          {usage && <UsageChart logs={usage.logs} unit={item.unit} />}

          {usage?.logs.length ? (
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {[...usage.logs].reverse().slice(0, 8).map(log => (
                <div key={log.id} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">{new Date(log.logged_at).toLocaleString()}</span>
                  <span className="font-medium text-gray-700">−{Number(log.quantity_used)} {item.unit}</span>
                  {log.notes && <span className="text-gray-300 truncate ml-2 max-w-[80px]">{log.notes}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No usage logged yet. <Link to="/usage" className="text-brand-600 hover:underline">Log usage →</Link>
            </p>
          )}
        </div>
      </div>

      {/* ── Forecast ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Stockout Forecast</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI analyzes usage patterns to predict when stock will run out</p>
          </div>
          <button
            onClick={handleGenerateForecast}
            disabled={loadingForecast}
            className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
          >
            {loadingForecast ? 'Generating…' : forecast ? '↻ Refresh' : '🤖 Generate Forecast'}
          </button>
        </div>

        {forecastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{forecastError}</div>
        )}

        {forecast ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ForecastCard forecast={forecast} unit={item.unit} />

            {/* Cost estimate card */}
            {costEstimate && (
              <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Reorder Cost Estimate</h3>
                <div>
                  <p className="text-2xl font-bold text-brand-800">${costEstimate}</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    {forecast.recommended_reorder_quantity} {item.unit} × ${Number(item.cost_per_unit).toFixed(2)}/{item.unit}
                  </p>
                </div>
                {forecast.recommended_reorder_date && (
                  <p className="text-xs text-brand-700">
                    Order by <strong>{forecast.recommended_reorder_date}</strong> to avoid stockout
                  </p>
                )}
                <button
                  onClick={handleLoadSuppliers}
                  className="text-xs text-brand-700 underline"
                >
                  Find cheaper eco-suppliers →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            Click "Generate Forecast" to predict when this item will run out
          </div>
        )}
      </div>

      {/* ── Eco-supplier suggestions ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Eco-Friendly Suppliers</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sustainable alternatives ranked by eco score, cost &amp; local proximity</p>
          </div>
          <div className="flex items-center gap-2">
            {suppliers.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${aiSuppliers ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {aiSuppliers ? '🤖 AI-ranked' : '⚡ Algorithm-ranked'}
              </span>
            )}
            <button
              onClick={handleLoadSuppliers}
              disabled={loadingSuppliers}
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
            >
              {loadingSuppliers ? 'Searching…' : suppliers.length ? '↻ Refresh' : '🌱 Find Suppliers'}
            </button>
          </div>
        </div>

        {supplierError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{supplierError}</div>
        )}

        {suppliers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s, i) => <SupplierCard key={s.id} supplier={s} rank={i + 1} />)}
          </div>
        ) : !loadingSuppliers && (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            Click "Find Suppliers" to see sustainable alternatives with cost &amp; carbon comparison
          </div>
        )}
      </div>
    </div>
  );
}
