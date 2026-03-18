import type { ForecastResult } from '../../types/index.js';

interface Props {
  forecast: ForecastResult;
  unit?: string;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'text-green-600', medium: 'text-amber-600', low: 'text-red-500',
};

export function ForecastCard({ forecast, unit = 'units' }: Props) {
  const pct = Math.round(forecast.confidence_score * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI Forecast</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${forecast.ai_generated ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {forecast.ai_generated ? '🤖 AI' : '⚡ Rule-based'}
        </span>
      </div>

      {forecast.days_until_stockout != null ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{forecast.days_until_stockout}</p>
            <p className="text-xs text-gray-500 mt-0.5">days until stockout</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${CONFIDENCE_COLOR[forecast.confidence]}`}>{pct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">confidence ({forecast.confidence})</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm">
          Not enough usage history to forecast
        </div>
      )}

      {forecast.predicted_burnout_date && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Predicted burnout:</span> {forecast.predicted_burnout_date}
        </div>
      )}

      {forecast.recommended_reorder_date && (
        <div className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
          📅 Reorder by <strong>{forecast.recommended_reorder_date}</strong>
          {forecast.recommended_reorder_quantity != null && (
            <span> — suggest ordering <strong>{forecast.recommended_reorder_quantity} {unit}</strong></span>
          )}
        </div>
      )}

      {forecast.reasoning && (
        <p className="text-xs text-gray-500 italic">{forecast.reasoning}</p>
      )}

      {!forecast.ai_generated && (
        <p className="text-xs text-amber-600">
          ⚡ AI Fallback Mode — using rule-based average calculation
        </p>
      )}
    </div>
  );
}
