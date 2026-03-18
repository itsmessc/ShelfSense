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
  is_archived: number; // 0 | 1
  created_at: string;
  updated_at: string;
  // computed fields (not stored)
  alert_status?: AlertStatus;
  forecast_days?: number | null;
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
  confidence_score: number; // 0.50 – 0.85
  reasoning?: string;
  ai_generated: boolean;
  fallback_method: 'rule-based-average' | null;
  predicted_burnout_date: string | null;
  recommended_reorder_date: string | null;
  recommended_reorder_quantity: number | null;
}

export interface Supplier {
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
}

export interface SupplierSuggestion extends Supplier {
  cost_comparison: 'cheaper' | 'same' | 'more_expensive' | 'unknown';
  cost_diff_pct: number | null;
  sustainability_score: number; // 0-100
}

export interface DashboardData {
  low_stock: Item[];
  expiring_soon: Array<Item & { days_until_expiry: number }>;
  sustainability_score: SustainabilityScore;
  totals: DashboardTotals;
  co2_saved_kg: number;
  waste_prevented_items: number;
}

export interface SustainabilityScore {
  score: number;           // 0-100 numeric
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    waste_reduction: number;     // 0-100
    reorder_coverage: number;    // 0-100
    supplier_diversity: number;  // 0-100
    cost_tracking: number;       // 0-100
  };
  label: 'Poor' | 'Fair' | 'Good' | 'Excellent';
}

export interface DashboardTotals {
  item_count: number;
  low_stock_count: number;
  expiring_within_7_days: number;
  expiring_within_30_days: number;
  critical_count: number;
  warning_count: number;
}

export class AiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('AI service unavailable');
    this.name = 'AiUnavailableError';
    this.cause = cause;
  }
}
