import { useEffect, useState } from 'react';
import { getAnalytics, type AnalyticsData } from '../api/client.js';
import { getDashboard } from '../api/dashboard.js';
import { downloadSustainabilityReport } from '../utils/pdfReport.js';
import type { DashboardData } from '../types/index.js';

function HBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 font-medium truncate">{label}</span>
        <span className="text-gray-500 ml-2 shrink-0">{sub ?? value}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const [data,      setData]      = useState<AnalyticsData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([getAnalytics(), getDashboard()])
      .then(([a, d]) => { setData(a); setDashboard(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Loading analytics…</div>;
  if (error)   return <div className="p-8 text-red-500">{error}</div>;
  if (!data)   return null;

  const maxCategoryCount = Math.max(...data.category_breakdown.map((c) => c.count), 1);
  const maxUsage = Math.max(...data.top_consumed.map((c) => Number(c.total_used)), 1);

  // Build last-14-day usage chart data
  const today = new Date();
  const chartDays: { label: string; key: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const row = data.daily_usage.find((r) => r.day.slice(0, 10) === key);
    chartDays.push({ label, key, total: row ? Number(row.total_used) : 0 });
  }
  const maxChart = Math.max(...chartDays.map((d) => d.total), 0.001);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📈 Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Inventory value, usage trends, and category insights</p>
        </div>
        {dashboard && (
          <button
            onClick={() => downloadSustainabilityReport(dashboard, data!)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-2"
          >
            📄 Download PDF Report
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items"        value={data.total_items} />
        <StatCard label="Inventory Value"    value={`$${data.total_inventory_value.toFixed(2)}`} color="text-brand-700" sub="estimated" />
        <StatCard label="Unique Suppliers"   value={data.unique_suppliers} sub={`${data.items_with_supplier} items tracked`} />
        <StatCard label="Cost Tracked"       value={`${Math.round((data.items_with_cost / Math.max(data.total_items, 1)) * 100)}%`} sub="items with cost/unit" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category breakdown */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items by Category</h2>
          <div className="space-y-3">
            {data.category_breakdown.map((cat) => (
              <HBar
                key={cat.category}
                label={cat.category}
                value={cat.count}
                max={maxCategoryCount}
                color="bg-brand-400"
                sub={`${cat.count} item${cat.count !== 1 ? 's' : ''}${cat.total_value > 0 ? ` · $${cat.total_value.toFixed(2)}` : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Top consumed */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Consumed (Last 30 Days)</h2>
          {data.top_consumed.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No usage recorded yet — start logging usage to see trends.</p>
          ) : (
            <div className="space-y-3">
              {data.top_consumed.map((item) => (
                <HBar
                  key={item.item_id}
                  label={item.name}
                  value={Number(item.total_used)}
                  max={maxUsage}
                  color="bg-blue-400"
                  sub={`${Number(item.total_used).toFixed(2)} ${item.unit} · ${item.log_count} log${item.log_count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily usage chart */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Daily Usage Activity — Last 14 Days</h2>
        {chartDays.every((d) => d.total === 0) ? (
          <p className="text-sm text-gray-400 py-4 text-center">No usage logged in the last 14 days.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-32">
              {chartDays.map((d, i) => {
                const h = Math.round((d.total / maxChart) * 96);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    {d.total > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                        {d.total.toFixed(1)} units
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${d.total > 0 ? 'bg-brand-400 hover:bg-brand-500' : 'bg-gray-100'}`}
                      style={{ height: `${Math.max(h, d.total > 0 ? 4 : 2)}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-0.5">
              <span>{chartDays[0].label}</span>
              <span>{chartDays[6].label}</span>
              <span>{chartDays[13].label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sustainability insight */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 space-y-2">
        <h2 className="text-sm font-semibold text-brand-800">🌿 Sustainability Insight</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-700">{data.unique_suppliers}</p>
            <p className="text-xs text-brand-600 mt-0.5">Unique suppliers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-700">
              {Math.round((data.items_with_supplier / Math.max(data.total_items, 1)) * 100)}%
            </p>
            <p className="text-xs text-brand-600 mt-0.5">Items with supplier tracked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-700">
              {Math.round((data.items_with_cost / Math.max(data.total_items, 1)) * 100)}%
            </p>
            <p className="text-xs text-brand-600 mt-0.5">Items with cost tracked</p>
          </div>
        </div>
        <p className="text-xs text-brand-600 mt-2">
          Use the Procurement Hub to discover eco-friendly suppliers and reduce your carbon footprint.
        </p>
      </div>
    </div>
  );
}
