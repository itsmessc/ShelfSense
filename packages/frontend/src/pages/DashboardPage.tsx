import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard.js';
import { SustainabilityScore } from '../components/dashboard/SustainabilityScore.js';

const STATUS_CLS: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  normal: 'bg-green-50 border-green-200 text-green-700',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-2 tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] font-semibold text-gray-400 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error, fetchDashboard } = useDashboard();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (isLoading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
      <p className="text-sm font-bold text-gray-400 animate-pulse">Loading dashboard performance...</p>
    </div>
  );
  
  if (error) return (
    <div className="p-8 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-red-500 font-bold mt-4">Error: {error}</p>
    </div>
  );
  
  if (!data) return null;

  const { totals, low_stock, expiring_soon, forecast_alerts, sustainability_score, co2_saved_kg, waste_prevented_items } = data;

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Real-time inventory intelligence
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Items"       value={totals.item_count}              color="text-gray-900" />
        <StatCard label="Critical Stock"    value={totals.critical_count}          color="text-red-600"  sub="Immediate action required" />
        <StatCard label="Warning items"     value={totals.warning_count}           color="text-amber-600" sub="Approaching threshold" />
        <StatCard label="Expiring Soon"     value={totals.expiring_within_7_days}  color="text-orange-600" sub="Within 7 days" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Forecast Alerts */}
        <div className="xl:col-span-2 space-y-6">
          {forecast_alerts && forecast_alerts.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">AI Reorder Insights</h3>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                  Smart Forecast
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {forecast_alerts.map((alert) => {
                  const urgent = alert.days_until_stockout <= 3;
                  const soon   = alert.days_until_stockout <= 7;
                  const cls = urgent
                    ? 'border-red-100 bg-red-50/30'
                    : soon
                    ? 'border-amber-100 bg-amber-50/30'
                    : 'border-blue-100 bg-blue-50/30';
                  
                  return (
                    <div key={alert.item_id} className={`group flex flex-col justify-between rounded-2xl border p-5 transition-all hover:shadow-md ${cls}`}>
                      <div className="flex justify-between items-start gap-3">
                        <Link to={`/inventory/${alert.item_id}`} className="font-bold text-gray-900 hover:text-brand-700 truncate block text-sm" title={alert.name}>
                          {alert.name}
                        </Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${urgent ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100'}`}>
                          {alert.days_until_stockout}d left
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-[11px] font-medium text-gray-500">
                          Order by <span className="text-gray-900 font-bold">{alert.recommended_reorder_date}</span>
                        </p>
                        <Link to={`/inventory/${alert.item_id}`} className="text-[10px] font-bold text-brand-600 hover:underline">
                          Action →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eco impact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-8 text-white shadow-lg shadow-brand-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Carbon Prevented</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-4xl font-black">{co2_saved_kg}</p>
                <p className="text-lg font-bold opacity-80">kg CO₂e</p>
              </div>
              <p className="text-xs font-medium mt-4 opacity-70">Calculated based on optimized usage patterns</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-8 text-white shadow-lg shadow-green-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Net Savings</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-4xl font-black">{waste_prevented_items}</p>
                <p className="text-lg font-bold opacity-80">Units</p>
              </div>
              <p className="text-xs font-medium mt-4 opacity-70">Total items saved from landfill this month</p>
            </div>
          </div>
        </div>

        {/* Sidebar content */}
        <div className="space-y-8">
          {/* Sustainability Widget */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <SustainabilityScore
              score={sustainability_score.score}
              grade={sustainability_score.grade}
              label={sustainability_score.label}
              breakdown={sustainability_score.breakdown}
            />
          </div>

          {/* Low Stock List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Urgent Restock</h3>
              <Link to="/inventory?status=critical" className="text-[10px] font-black text-brand-600 hover:underline uppercase tracking-wider">View All</Link>
            </div>
            {low_stock.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-2xl">
                <span className="text-2xl">✨</span>
                <p className="text-xs font-bold text-gray-400 mt-2">Inventory is looking great!</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {low_stock.slice(0, 5).map((item) => {
                  const s = item.alert_status ?? 'normal';
                  return (
                    <li key={item.id} className={`group flex items-center justify-between p-3 rounded-2xl border transition-all hover:translate-x-1 ${STATUS_CLS[s]} border-opacity-50`}>
                      <Link to={`/inventory/${item.id}`} className="font-bold text-sm truncate hover:underline flex-1 pr-4" title={item.name}>
                        {item.name}
                      </Link>
                      <span className="text-[10px] font-black whitespace-nowrap opacity-80">
                        {Number(item.quantity).toLocaleString()} / {Number(item.reorder_threshold)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Expiring soon */}
      {expiring_soon.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Expiring Soon</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {expiring_soon.map((item) => (
              <Link
                key={item.id}
                to={`/inventory/${item.id}`}
                className={`group rounded-2xl p-5 border transition-all hover:shadow-lg ${item.days_until_expiry <= 7 ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}
              >
                <p className="font-extrabold text-sm text-gray-900 truncate tracking-tight group-hover:text-brand-700" title={item.name}>{item.name}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{Number(item.quantity)} {item.unit}</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm ${item.days_until_expiry <= 7 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {item.days_until_expiry === 0 ? 'Today' : `${item.days_until_expiry}d left`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
