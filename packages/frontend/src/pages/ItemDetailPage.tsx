import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getItem, generateForecast, getUsageHistory, getSupplierSuggestions } from '../api/client.js';
import { ForecastCard } from '../components/forecast/ForecastCard.js';
import { SupplierCard } from '../components/procurement/SupplierCard.js';
import { UsageChart } from '../components/usage/UsageChart.js';
import { BatchManager } from '../components/inventory/BatchManager.js';
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
    <div className="p-8 space-y-10 max-w-6xl mx-auto pb-20">

      {/* ── Hero Header ── */}
      <div className="relative">
        <button onClick={() => navigate(-1)} className="absolute -left-12 top-1 text-gray-400 hover:text-brand-600 transition-colors bg-white p-2 rounded-xl shadow-sm border border-gray-100 group">
          <span className="group-hover:-translate-x-1 inline-block transition-transform">←</span>
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-100">
                {item.category}
              </span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${STATUS_CLS[status]}`}>
                {status} Status
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              {item.name}
            </h1>
            <p className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Intelligence synced {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex gap-3">
             <button className="bg-white border border-gray-100 text-gray-600 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95">
              Edit Item
            </button>
            <button className="bg-brand-600 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95">
              Log Usage
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Stock Level', value: `${Number(item.quantity)}`, unit: item.unit, icon: '📦' },
          { label: 'Minimum', value: `${Number(item.reorder_threshold)}`, unit: item.unit, icon: '📉' },
          { label: 'Unit Cost', value: `$${Number(item.cost_per_unit || 0).toFixed(2)}`, unit: '', icon: '💰' },
          { label: 'Stock Value', value: `$${(Number(item.quantity) * Number(item.cost_per_unit || 0)).toLocaleString()}`, unit: '', icon: '📈' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{stat.unit}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Detailed Specs */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-8">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Metadata & Suppliers</h2>
          <div className="space-y-6">
            {[
              ['Primary Supplier', item.supplier ?? 'Not specified'],
              ['Earliest Expiry',  item.expiry_date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(item.expiry_date)) : 'Shelf Stable'],
              ['Last Purchase',    item.purchase_date ?? 'Unknown'],
              ['Onboarding Date',  new Date(item.created_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-50">
            <BatchManager batches={item.batches || []} unit={item.unit} />
          </div>
          
          <div className="pt-4 border-t border-gray-50">
            <button 
              onClick={handleLoadSuppliers}
              className="w-full bg-brand-50 text-brand-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
            >
              🌱 Find Sustainable Sources
            </button>
          </div>
        </div>

        {/* Usage Analytics */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Consumption Trends</h2>
              {usage?.average_daily_usage != null && (
                <p className="text-sm font-bold text-gray-900 mt-1">Average {usage.average_daily_usage} {item.unit} / day</p>
              )}
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-100" />
            </div>
          </div>

          <div className="h-64 relative">
             {usage ? (
               <UsageChart logs={usage.logs} unit={item.unit} />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-sm font-bold">
                 Gathering usage data...
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {usage?.logs.length ? (
               [...usage.logs].reverse().slice(0, 4).map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xs shadow-sm">
                    📉
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 flex justify-between">
                      <span>−{Number(log.quantity_used)} {item.unit}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(log.logged_at).toLocaleDateString()}</span>
                    </p>
                    {log.notes && <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5 italic">"{log.notes}"</p>}
                  </div>
                </div>
              ))
             ) : (
                <p className="text-sm text-gray-400 col-span-2">No recent usage activity.</p>
             )}
          </div>
        </div>
      </div>

      {/* ── AI Intelligence Section ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Forecast Card */}
        <div className="bg-gradient-to-br from-gray-900 to-brand-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32 group-hover:opacity-30 transition-opacity" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                <h2 className="text-2xl font-black tracking-tight">AI Stockout Forecast</h2>
              </div>
              <button
                onClick={handleGenerateForecast}
                disabled={loadingForecast}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingForecast ? 'Computing...' : forecast ? 'Recalculate' : 'Analyze Now'}
              </button>
            </div>

            {forecastError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 text-xs font-bold text-red-200">
                ⚠️ {forecastError}
              </div>
            )}

            {forecast ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                    <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-3">Estimated Exhaustion</p>
                    <p className="text-3xl font-black text-white">{forecast.days_until_stockout} <span className="text-sm font-bold opacity-60 uppercase">Days</span></p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Stockout Date</p>
                    <p className="text-xl font-black text-white">{forecast.predicted_burnout_date}</p>
                  </div>
                </div>
                
                {costEstimate && (
                  <div className="bg-brand-500/20 border border-brand-500/30 rounded-3xl p-8 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2">Recommended Replenishment</p>
                      <p className="text-3xl font-black text-white">${costEstimate}</p>
                      <p className="text-[10px] font-bold text-brand-400 mt-1">For {forecast.recommended_reorder_quantity} {item.unit}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1">Target Reorder Date</p>
                       <p className="text-sm font-black text-white">{forecast.recommended_reorder_date}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <p className="text-brand-300 font-bold">Waiting for command to initiate predictive analysis</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Historical usage trends ready for processing</p>
              </div>
            )}
          </div>
        </div>

        {/* Suppliers Section */}
        <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌱</span>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sustainable Sourcing</h2>
              </div>
              {suppliers.length > 0 && (
                 <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase border border-brand-100">
                  {aiSuppliers ? 'Gemini Ranked' : 'Smart Ranked'}
                </span>
              )}
           </div>

           {suppliers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {suppliers.slice(0, 3).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-6 p-6 rounded-[24px] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-xl font-black text-brand-600 shadow-sm group-hover:scale-110 transition-transform">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900">{s.name}</p>
                      <div className="flex gap-3 mt-1 underline-offset-4">
                         <span className="text-[10px] font-bold text-brand-600 uppercase">Eco Score: {s.sustainability_score}/100</span>
                         <span className="text-[10px] font-bold text-gray-400 uppercase">${Number(s.price_per_unit).toFixed(2)} / {item.unit}</span>
                      </div>
                    </div>
                    <button className="bg-white border border-gray-200 text-gray-400 w-10 h-10 rounded-xl hover:text-brand-600 hover:border-brand-200 transition-colors flex items-center justify-center">
                      →
                    </button>
                  </div>
                ))}
              </div>
           ) : (
             <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-2xl grayscale opacity-50">🌱</div>
               <p className="text-sm font-bold text-gray-400">Discover eco-conscious alternatives</p>
               <button 
                  onClick={handleLoadSuppliers}
                  disabled={loadingSuppliers}
                  className="mt-2 text-xs font-black text-brand-600 uppercase tracking-widest hover:underline"
                >
                  {loadingSuppliers ? 'Scanning Global Database...' : 'Run Supplier Audit →'}
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
