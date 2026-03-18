export interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date: string | null;
  reorder_threshold: number;
  created_at: string;
  updated_at: string;
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
  reasoning?: string;
}

export interface UsageHistory {
  logs: UsageLog[];
  average_daily_usage: number | null;
  forecast: ForecastResult;
}

export interface DashboardData {
  low_stock: Item[];
  expiring_soon: Array<Item & { days_until_expiry: number }>;
  sustainability_score: {
    score: number;
    breakdown: {
      items_before_expiry_ratio: number;
      reorder_coverage: number;
    };
    label: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  };
  totals: {
    item_count: number;
    low_stock_count: number;
    expiring_within_7_days: number;
    expiring_within_30_days: number;
  };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
