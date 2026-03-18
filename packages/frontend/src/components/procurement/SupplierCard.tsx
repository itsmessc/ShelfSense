import type { SupplierSuggestion } from '../../types/index.js';

interface Props { supplier: SupplierSuggestion; rank: number; }

const COST_CONFIG = {
  cheaper:       { label: '💚 Cheaper',          cls: 'text-green-600' },
  same:          { label: '➖ Same price',        cls: 'text-gray-600' },
  more_expensive:{ label: '💸 Premium',           cls: 'text-amber-600' },
  unknown:       { label: 'Price unknown',        cls: 'text-gray-400' },
};

export function SupplierCard({ supplier: s, rank }: Props) {
  const cc = COST_CONFIG[s.cost_comparison];

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">#{rank}</span>
            <h4 className="font-semibold text-gray-900 text-sm">{s.name}</h4>
            {s.is_local && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Local</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{s.location}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-gray-900">${s.price_per_unit.toFixed(2)}</p>
          <p className={`text-xs font-medium ${cc.cls}`}>
            {cc.label}{s.cost_diff_pct != null ? ` (${s.cost_diff_pct > 0 ? '+' : ''}${s.cost_diff_pct}%)` : ''}
          </p>
        </div>
      </div>

      {/* Sustainability score bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Sustainability</span>
          <span className="font-medium">{s.sustainability_score}/100</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: `${s.sustainability_score}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-600">
        <span>🌱 {s.carbon_footprint_kg} kg CO₂</span>
        <span>🚚 {s.delivery_days} day{s.delivery_days !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {s.eco_credentials.map((c) => (
          <span key={c} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{c}</span>
        ))}
      </div>
    </div>
  );
}
