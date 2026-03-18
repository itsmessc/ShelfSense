import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard.js';
import { SustainabilityScore } from '../components/dashboard/SustainabilityScore.js';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error, fetchDashboard } = useDashboard();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) return <div className="p-8 text-gray-400">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const { totals, low_stock, expiring_soon, sustainability_score } = data;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your inventory health</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={totals.item_count} color="text-gray-800" />
        <StatCard label="Low Stock" value={totals.low_stock_count} color="text-amber-600" />
        <StatCard label="Expiring in 7 days" value={totals.expiring_within_7_days} color="text-orange-600" />
        <StatCard label="Expiring in 30 days" value={totals.expiring_within_30_days} color="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sustainability */}
        <SustainabilityScore
          score={sustainability_score.score}
          label={sustainability_score.label}
          breakdown={sustainability_score.breakdown}
        />

        {/* Low Stock */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Low Stock</h3>
            <Link to="/inventory?low_stock=true" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {low_stock.length === 0 ? (
            <p className="text-sm text-gray-400">All items are well stocked!</p>
          ) : (
            <ul className="space-y-2">
              {low_stock.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800 truncate">{item.name}</span>
                  <span className="text-amber-600 ml-2 shrink-0">
                    {Number(item.quantity)} / {Number(item.reorder_threshold)} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Expiring soon */}
      {expiring_soon.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Expiring Soon
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiring_soon.map((item) => (
              <div key={item.id} className={`rounded-xl p-3 border ${item.days_until_expiry <= 7 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {Number(item.quantity)} {item.unit}
                </p>
                <p className={`text-xs font-semibold mt-1 ${item.days_until_expiry <= 7 ? 'text-red-600' : 'text-yellow-700'}`}>
                  Expires in {item.days_until_expiry} day{item.days_until_expiry !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
