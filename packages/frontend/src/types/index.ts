export type AlertStatus = 'critical' | 'warning' | 'normal';

export interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date: string | null;
  reorder_threshold: number;
  cost_per_unit: number | null;
  supplier: string | null;
  purchase_date: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  alert_status?: AlertStatus;
  forecast_days?: number | null;
  batches?:      ItemBatch[];
}

export interface ItemBatch {
  id:          number;
  item_id:     number;
  quantity:    number;
  expiry_date: string | null;
  received_at: string;
}

export interface UsageLog {
  id: number;
  item_id: number;
  quantity_used: number;
  logged_at: string;
  notes: string | null;
}

export interface ForecastResult {
  days_until_stockout: number | null;
  confidence: 'low' | 'medium' | 'high';
  confidence_score: number;
  reasoning?: string;
  ai_generated: boolean;
  ai_provider: 'gemini' | 'openai' | null;
  fallback_method: 'rule-based-average' | null;
  predicted_burnout_date: string | null;
  recommended_reorder_date: string | null;
  recommended_reorder_quantity: number | null;
  item_id?: number;
}

export interface SupplierSuggestion {
  id: string;
  name: string;
  location: string;
  is_local: boolean;
  price_per_unit: number;
  currency: string;
  carbon_footprint_kg: number;
  eco_credentials: string[];
  delivery_days: number;
  categories: string[];
  cost_comparison: 'cheaper' | 'same' | 'more_expensive' | 'unknown';
  cost_diff_pct: number | null;
  sustainability_score: number;
}

export interface UsageHistory {
  logs: UsageLog[];
  average_daily_usage: number | null;
  forecast: ForecastResult;
}

export interface ForecastAlert {
  item_id: number;
  name: string;
  unit: string;
  days_until_stockout: number;
  predicted_burnout_date: string;
  recommended_reorder_date: string;
  confidence: 'low' | 'medium' | 'high';
  ai_generated: boolean;
}

export interface DashboardData {
  low_stock: Item[];
  expiring_soon: Array<Item & { days_until_expiry: number }>;
  forecast_alerts: ForecastAlert[];
  sustainability_score: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
      waste_reduction: number;
      reorder_coverage: number;
      supplier_diversity: number;
      cost_tracking: number;
    };
    label: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  };
  totals: {
    item_count: number;
    low_stock_count: number;
    expiring_within_7_days: number;
    expiring_within_30_days: number;
    critical_count: number;
    warning_count: number;
  };
  co2_saved_kg: number;
  waste_prevented_items: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
