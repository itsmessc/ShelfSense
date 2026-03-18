import type { UsageLog } from '../../types/index.js';

interface Props {
  logs: UsageLog[];
  unit: string;
}

export function UsageChart({ logs, unit }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-gray-400 text-sm bg-gray-50 rounded-xl">
        No usage data to display
      </div>
    );
  }

  // Group logs by day (last 14 days)
  const now = Date.now();
  const days: { label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const total = logs
      .filter(l => l.logged_at.slice(0, 10) === key)
      .reduce((s, l) => s + Number(l.quantity_used), 0);
    days.push({ label, total });
  }

  const max = Math.max(...days.map(d => d.total), 0.001);
  const BAR_H = 80;

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">Daily usage — last 14 days ({unit})</p>
      <div className="flex items-end gap-1 h-24">
        {days.map((d, i) => {
          const h = Math.round((d.total / max) * BAR_H);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {d.total > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                  {d.total.toFixed(2)} {unit}
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
        <span>{days[0].label}</span>
        <span>{days[6].label}</span>
        <span>{days[13].label}</span>
      </div>
    </div>
  );
}
