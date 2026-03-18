import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard.js';
import { SustainabilityScore } from '../components/dashboard/SustainabilityScore.js';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const STATUS_CLS: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  normal: 'bg-green-50 border-green-200 text-green-700',
};

export function DashboardPage() {
  const { data, isLoading, error, fetchDashboard } = useDashboard();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (isLoading) return <div className="p-8 text-gray-400">Loading dashboard…</div>;
  if (error)     return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data)     return null;

  const { totals, low_stock, expiring_soon, sustainability_score, co2_saved_kg, waste_prevented_items } = data;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Inventory health at a glance</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items"       value={totals.item_count}              color="text-gray-800" />
        <StatCard label="Critical"          value={totals.critical_count}          color="text-red-600"  sub="needs immediate attention" />
        <StatCard label="Warning"           value={totals.warning_count}           color="text-amber-600" sub="watch these items" />
        <StatCard label="Expiring (7 days)" value={totals.expiring_within_7_days}  color="text-orange-600" />
      </div>

      {/* Eco impact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">CO₂ Prevented</p>
          <p className="text-3xl font-bold text-brand-700 mt-1">{co2_saved_kg} <span className="text-base font-normal">kg</span></p>
          <p className="text-xs text-brand-500 mt-0.5">Estimated from fresh inventory</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Waste Prevented</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{waste_prevented_items} <span className="text-base font-normal">items</span></p>
          <p className="text-xs text-green-500 mt-0.5">Items used before expiry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sustainability */}
        <SustainabilityScore
          score={sustainability_score.score}
          grade={sustainability_score.grade}
          label={sustainability_score.label}
          breakdown={sustainability_score.breakdown}
        />

        {/* Low / Critical Stock */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Needs Attention</h3>
            <Link to="/inventory?status=critical" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {low_stock.length === 0 ? (
            <p className="text-sm text-gray-400">All items are well stocked!</p>
          ) : (
            <ul className="space-y-2">
              {low_stock.slice(0, 6).map((item) => {
                const s = item.alert_status ?? 'normal';
                return (
                  <li key={item.id} className={`flex items-center justify-between text-sm rounded-lg px-3 py-1.5 border ${STATUS_CLS[s]}`}>
                    <Link to={`/inventory/${item.id}`} className="font-medium truncate hover:underline">{item.name}</Link>
                    <span className="ml-2 shrink-0">{Number(item.quantity)} / {Number(item.reorder_threshold)} {item.unit}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Expiring soon */}
      {expiring_soon.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Expiring Soon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiring_soon.map((item) => (
              <Link
                key={item.id}
                to={`/inventory/${item.id}`}
                className={`rounded-xl p-3 border block hover:opacity-80 ${item.days_until_expiry <= 7 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
              >
                <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{Number(item.quantity)} {item.unit}</p>
                <p className={`text-xs font-semibold mt-1 ${item.days_until_expiry <= 7 ? 'text-red-600' : 'text-yellow-700'}`}>
                  {item.days_until_expiry === 0 ? 'Expires today' : `Expires in ${item.days_until_expiry}d`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
