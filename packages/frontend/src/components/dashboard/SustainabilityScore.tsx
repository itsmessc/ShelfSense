interface Props {
  score: number;
  label: string;
  breakdown: {
    items_before_expiry_ratio: number;
    reorder_coverage: number;
  };
}

export function SustainabilityScore({ score, label, breakdown }: Props) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#16a34a' : score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  const labelColor =
    score >= 80 ? 'text-green-700' : score >= 60 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Sustainability Score
      </h3>
      <div className="flex items-center gap-6">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="45" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
            {score}
          </text>
          <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#6b7280">
            / 100
          </text>
        </svg>

        <div className="flex-1 space-y-3">
          <div className={`text-lg font-bold ${labelColor}`}>{label}</div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Freshness ratio</span>
              <span className="font-medium">{Math.round(breakdown.items_before_expiry_ratio * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Reorder coverage</span>
              <span className="font-medium">{Math.round(breakdown.reorder_coverage * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
