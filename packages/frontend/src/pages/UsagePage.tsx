import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItems } from '../hooks/useItems.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';
import { getRecentLogs } from '../api/client.js';

type RecentLog = {
  id: number; item_id: number; quantity_used: number;
  logged_at: string; notes: string | null; item_name: string; unit: string;
};

export function UsagePage() {
  const { items, fetchItems } = useItems();
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function loadLogs() {
    setLoadingLogs(true);
    getRecentLogs()
      .then(res => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }

  useEffect(() => { loadLogs(); }, []);

  function handleSuccess() {
    fetchItems();
    loadLogs();
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Record consumption to enable AI forecasting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log form */}
        <div className="space-y-4">
          <UsageLogForm items={items} onSuccess={handleSuccess} />

          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-brand-800 mb-2">How forecasting works</h3>
            <ul className="text-sm text-brand-700 space-y-1 list-disc list-inside">
              <li>Log usage regularly to build a history</li>
              <li>AI analyzes your patterns and predicts stockouts</li>
              <li>View forecasts on each item's detail page</li>
              <li>Falls back to math-based forecast if AI is unavailable</li>
            </ul>
          </div>
        </div>

        {/* Recent logs */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Usage Logs</h2>

          {loadingLogs ? (
            <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center">
              No usage logged yet. Use the form to record your first entry.
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/inventory/${log.item_id}`}
                      className="font-medium text-gray-800 hover:text-brand-600 truncate block"
                    >
                      {log.item_name}
                    </Link>
                    {log.notes && (
                      <span className="text-xs text-gray-400 truncate block">{log.notes}</span>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className="font-semibold text-gray-700">
                      −{Number(log.quantity_used)} {log.unit}
                    </span>
                    <p className="text-xs text-gray-400">
                      {new Date(log.logged_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
