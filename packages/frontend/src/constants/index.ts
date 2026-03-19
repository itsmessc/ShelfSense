/** Shared application constants. */

export const ALERT_STATUS_LABELS: Record<string, string> = {
  critical: 'Critical',
  warning:  'Warning',
  normal:   'Normal',
};

export const CONFIDENCE_COLOURS: Record<string, string> = {
  high:   'text-green-600',
  medium: 'text-amber-600',
  low:    'text-red-500',
};

export const AI_PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini AI',
  openai: 'OpenAI',
};

export const CATEGORIES = [
  'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Lab & Equipment', 'Chemicals',
  'Office Supplies', 'Other',
] as const;

export const ITEMS_PER_PAGE = 25;
export const REORDER_URGENCY_DAYS = 14;
export const EXPIRY_WARN_DAYS     = 30;
