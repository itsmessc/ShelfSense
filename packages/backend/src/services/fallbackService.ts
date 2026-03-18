import type { Item, UsageLog, ForecastResult } from '../types/index.js';

const KEYWORD_MAP: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['almond milk', 'oat milk', 'soy milk', 'coconut milk', 'cashew milk', 'rice milk'], category: 'Dairy Alternatives' },
  { keywords: ['coffee', 'tea', 'juice', 'kombucha', 'beverage', 'drink'], category: 'Beverages' },
  { keywords: ['soap', 'detergent', 'cleaner', 'towel', 'sponge', 'brush'], category: 'Cleaning Supplies' },
  { keywords: ['vinegar', 'sauce', 'mustard', 'ketchup', 'dressing', 'marinade', 'spice', 'herb'], category: 'Condiments' },
  { keywords: ['kimchi', 'kefir', 'miso', 'tempeh', 'ferment', 'yogurt'], category: 'Fermented Goods' },
  { keywords: ['glove', 'pipette', 'flask', 'beaker', 'centrifuge', 'microscope', 'lab'], category: 'Lab & Equipment' },
  { keywords: ['alcohol', 'acid', 'base', 'solvent', 'reagent', 'chemical', 'sanitizer', 'isopropyl'], category: 'Chemicals' },
  { keywords: ['paper', 'pen', 'pencil', 'staple', 'folder', 'binder', 'tape', 'marker', 'printer'], category: 'Office Supplies' },
  { keywords: ['chickpea', 'lentil', 'kidney bean', 'black bean', 'white bean', 'pea', 'soybean', 'legume'], category: 'Legumes' },
  { keywords: ['oat', 'wheat', 'rice', 'flour', 'quinoa', 'grain', 'barley', 'millet', 'corn', 'cereal'], category: 'Grains & Cereals' },
  { keywords: ['spinach', 'tomato', 'carrot', 'lettuce', 'kale', 'broccoli', 'onion', 'potato', 'apple', 'banana', 'berry'], category: 'Produce' },
  { keywords: ['oil', 'butter', 'ghee', 'fat', 'lard'], category: 'Oils & Fats' },
  { keywords: ['almond', 'walnut', 'cashew', 'seed', 'chia', 'flax', 'hemp', 'sunflower', 'pumpkin', 'peanut'], category: 'Seeds & Nuts' },
];

export function categorizeItem(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

export function buildForecastResult(
  days: number | null,
  confidence: ForecastResult['confidence'],
  aiGenerated: boolean,
  reasoning?: string
): ForecastResult {
  const confidenceScore = aiGenerated ? 0.85 : confidence === 'high' ? 0.75 : confidence === 'medium' ? 0.65 : 0.50;

  const burnout = days != null
    ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    : null;

  const reorderDate = burnout
    ? new Date(new Date(burnout).getTime() - 3 * 86400000).toISOString().slice(0, 10)
    : null;

  return {
    days_until_stockout: days,
    confidence,
    confidence_score: confidenceScore,
    reasoning,
    ai_generated: aiGenerated,
    fallback_method: aiGenerated ? null : 'rule-based-average',
    predicted_burnout_date: burnout,
    recommended_reorder_date: reorderDate,
    recommended_reorder_quantity: null, // set by caller if needed
  };
}

export function forecastStockout(item: Item, logs: UsageLog[]): ForecastResult {
  if (logs.length === 0) {
    return buildForecastResult(null, 'low', false, 'No usage history available');
  }

  const totalUsed = logs.reduce((sum, l) => sum + Number(l.quantity_used), 0);
  const earliest = new Date(logs[0].logged_at).getTime();
  const latest = new Date(logs[logs.length - 1].logged_at).getTime();
  const daySpan = Math.max((latest - earliest) / 86400000, 1);
  const avgDaily = totalUsed / daySpan;

  if (avgDaily <= 0) {
    return buildForecastResult(null, 'low', false, 'Average daily usage is zero');
  }

  const days = Math.round(Number(item.quantity) / avgDaily);
  const confidence: ForecastResult['confidence'] =
    logs.length >= 7 ? 'high' : logs.length >= 3 ? 'medium' : 'low';

  const result = buildForecastResult(
    days,
    confidence,
    false,
    `Based on ${logs.length} usage records averaging ${avgDaily.toFixed(3)} ${item.unit}/day`
  );

  // Recommend reorder quantity: enough for 2× the reorder threshold
  result.recommended_reorder_quantity =
    Number(item.reorder_threshold) > 0
      ? Number(item.reorder_threshold) * 2
      : Math.round(avgDaily * 14); // 2-week supply

  return result;
}
