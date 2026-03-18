import { useEffect } from 'react';
import { useItems } from '../hooks/useItems.js';
import { UsageLogForm } from '../components/usage/UsageLogForm.js';

export function UsagePage() {
  const { items, fetchItems } = useItems();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Record consumption to enable AI forecasting</p>
      </div>

      <div className="max-w-md">
        <UsageLogForm
          items={items}
          onSuccess={fetchItems}
        />
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 max-w-md">
        <h3 className="text-sm font-semibold text-brand-800 mb-2">How forecasting works</h3>
        <ul className="text-sm text-brand-700 space-y-1 list-disc list-inside">
          <li>Log usage regularly to build a history</li>
          <li>AI analyzes your patterns and predicts stockouts</li>
          <li>View forecasts on each item's detail page</li>
          <li>Falls back to math-based forecast if AI is unavailable</li>
        </ul>
      </div>
    </div>
  );
}
