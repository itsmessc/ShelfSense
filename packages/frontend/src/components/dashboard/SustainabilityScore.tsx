interface Props {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  breakdown: {
    waste_reduction: number;
    reorder_coverage: number;
    supplier_diversity: number;
    cost_tracking: number;
  };
}

const GRADE_COLOR: Record<string, { ring: string; text: string }> = {
  A: { ring: '#16a34a', text: 'text-green-700' },
  B: { ring: '#22c55e', text: 'text-green-600' },
  C: { ring: '#f59e0b', text: 'text-amber-600' },
  D: { ring: '#f97316', text: 'text-orange-600' },
  F: { ring: '#ef4444', text: 'text-red-600' },
};

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function SustainabilityScore({ score, grade, label, breakdown }: Props) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const gc = GRADE_COLOR[grade];

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Sustainability Score
      </h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width="110" height="110" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={gc.ring} strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black ${gc.text}`}>{grade}</span>
            <span className="text-xs text-gray-400">{score}/100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <p className={`text-base font-bold ${gc.text}`}>{label}</p>
          <Bar label="Waste reduction"   value={breakdown.waste_reduction}   color="bg-brand-500" />
          <Bar label="Reorder coverage"  value={breakdown.reorder_coverage}  color="bg-blue-400" />
          <Bar label="Supplier diversity"value={breakdown.supplier_diversity} color="bg-purple-400" />
          <Bar label="Cost tracking"     value={breakdown.cost_tracking}     color="bg-amber-400" />
        </div>
      </div>
    </div>
  );
}
