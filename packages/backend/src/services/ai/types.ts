/** Shared types and constants for the AI provider layer. */

export const CATEGORIES = [
  'Grains & Cereals', 'Dairy Alternatives', 'Produce', 'Legumes',
  'Beverages', 'Oils & Fats', 'Seeds & Nuts', 'Cleaning Supplies',
  'Condiments', 'Fermented Goods', 'Lab & Equipment', 'Chemicals',
  'Office Supplies', 'Other',
] as const;

export interface ScannedItem {
  name: string;
  estimated_quantity: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}
