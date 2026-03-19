import { useEffect } from 'react';
import { useAudit } from '../hooks/useAudit.js';

const ACTION_ICONS: Record<string, string> = {
  create:       '✅',
  update:       '✏️',
  delete:       '🗑️',
  log_usage:    '📉',
  batch_usage:  '📦',
  import:       '⬆️',
  export:       '⬇️',
  bulk_delete:  '🗑️',
  bulk_export:  '⬇️',
};

const ACTION_COLOURS: Record<string, string> = {
  create:       'bg-green-100 text-green-700 border-green-200',
  update:       'bg-blue-100 text-blue-700 border-blue-200',
  delete:       'bg-red-100 text-red-700 border-red-200',
  log_usage:    'bg-purple-100 text-purple-700 border-purple-200',
  batch_usage:  'bg-purple-100 text-purple-700 border-purple-200',
  import:       'bg-amber-100 text-amber-700 border-amber-200',
  export:       'bg-gray-100 text-gray-700 border-gray-200',
};

const ENTITY_LABELS: Record<string, string> = {
  item:   'Item',
  usage:  'Usage',
  import: 'Import',
  export: 'Export',
  bulk:   'Bulk',
};

function timeAgo(isoDate: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  
  if (diff < 10) return 'Just now';
  
  if (diff < 60) {
    const s = Math.round(diff);
    return `${s} ${s === 1 ? 'sec' : 'secs'} ago`;
  }
  if (diff < 3600) {
    const m = Math.round(diff / 60);
    return `${m} ${m === 1 ? 'min' : 'min'} ago`;
  }
  if (diff < 86400) {
    const h = Math.round(diff / 3600);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diff < 2592000) { // < 30 days
    const d = Math.round(diff / 86400);
    return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function AuditPage() {
  const { entries, isLoading, error, fetchAudit } = useAudit();

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  // Group entries by date
  const grouped: Record<string, typeof entries> = {};
  for (const e of entries) {
    const day = new Date(e.created_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Full history of all inventory actions</p>
        </div>
        <button
          onClick={fetchAudit}
          className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          ↻ Refresh
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading audit log…</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-16 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No audit entries yet</p>
          <p className="text-sm mt-1">Actions like adding items, logging usage, or importing will appear here</p>
        </div>
      )}

      {!isLoading && Object.entries(grouped).map(([day, dayEntries]) => (
        <div key={day} className="space-y-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-4 border-l-2 border-gray-200">
            {day}
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border divide-y divide-gray-50">
            {dayEntries.map((entry) => {
              const icon  = ACTION_ICONS[entry.action]  ?? '📌';
              const color = ACTION_COLOURS[entry.action] ?? 'bg-gray-100 text-gray-700 border-gray-200';
              const label = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type;
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="text-xl mt-0.5 shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{label}</span>
                      {entry.entity_id && (
                        <span className="text-xs text-gray-400">#{entry.entity_id}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{entry.summary}</p>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 mt-1">{timeAgo(entry.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
