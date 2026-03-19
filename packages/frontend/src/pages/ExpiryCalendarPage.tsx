import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api/base.js';
import type { Item } from '../types/index.js';

interface CalendarData {
  items_by_date: Record<string, Item[]>;
  summary: { this_month: number; expired_total: number };
}

function getDayColor(dateStr: string): string {
  const days = Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0)  return 'bg-gray-100 text-gray-400 border-gray-200';
  if (days <= 3)  return 'bg-red-50 border-red-300';
  if (days <= 7)  return 'bg-orange-50 border-orange-300';
  if (days <= 14) return 'bg-yellow-50 border-yellow-300';
  return 'bg-green-50 border-green-200';
}

function ItemChip({ item }: { item: Item }) {
  const days = item.expiry_date
    ? Math.round((new Date(item.expiry_date).getTime() - Date.now()) / 86400000)
    : null;
  const cls = days == null ? 'bg-gray-100 text-gray-600'
    : days < 0  ? 'bg-gray-200 text-gray-500 line-through'
    : days <= 3 ? 'bg-red-100 text-red-700'
    : days <= 7 ? 'bg-orange-100 text-orange-700'
    : 'bg-green-100 text-green-700';
  return (
    <Link to={`/inventory/${item.id}`}>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium truncate block max-w-full hover:opacity-75 ${cls}`}>
        {item.name}
      </span>
    </Link>
  );
}

export function ExpiryCalendarPage() {
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await request<CalendarData>(`/api/items/expiry-calendar?year=${y}&month=${m}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay   = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Mon=0

  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expiry Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Track upcoming item expirations month by month</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <div className="text-sm text-gray-500 mr-4">
              <span className="font-medium text-orange-600">{data.summary.this_month}</span> items expiring this view
              {data.summary.expired_total > 0 && (
                <span className="ml-3 text-red-500 font-medium">{data.summary.expired_total} already expired</span>
              )}
            </div>
          )}
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold">‹</button>
          <span className="text-sm font-semibold text-gray-700 w-40 text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold">›</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs flex-wrap">
        {[
          { cls: 'bg-red-100 text-red-700',    label: '≤ 3 days' },
          { cls: 'bg-orange-100 text-orange-700', label: '≤ 7 days' },
          { cls: 'bg-yellow-100 text-yellow-700', label: '≤ 14 days' },
          { cls: 'bg-green-100 text-green-700',  label: '> 14 days' },
          { cls: 'bg-gray-200 text-gray-500',   label: 'Expired' },
        ].map(({ cls, label }) => (
          <span key={label} className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
          ))}
        </div>

        {/* Cells */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading calendar…</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[100px] bg-gray-50/30" />;
              const dateStr = `${year}-${pad(month)}-${pad(day)}`;
              const items   = data?.items_by_date[dateStr] ?? [];
              const isToday = dateStr === today;
              const hasItems = items.length > 0;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[100px] p-2 transition-colors ${
                    hasItems ? getDayColor(dateStr) : 'hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-inset ring-brand-400' : ''}`}
                >
                  <div className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-brand-600 text-white' : 'text-gray-500'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((item) => <ItemChip key={item.id} item={item} />)}
                    {items.length > 3 && (
                      <span className="text-xs text-gray-400">+{items.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
