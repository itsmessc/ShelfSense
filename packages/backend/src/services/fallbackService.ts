import type { Item, UsageLog, ForecastResult } from '../types/index.js';

// Order matters: more specific / multi-word phrases checked before single keywords
const KEYWORD_MAP: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['almond milk', 'oat milk', 'soy milk', 'coconut milk', 'cashew milk', 'rice milk'], category: 'Dairy Alternatives' },
  { keywords: ['coffee', 'tea', 'juice', 'kombucha', 'beverage', 'drink'], category: 'Beverages' },
  { keywords: ['soap', 'detergent', 'cleaner', 'towel', 'sponge', 'brush'], category: 'Cleaning Supplies' },
  { keywords: ['vinegar', 'sauce', 'mustard', 'ketchup', 'dressing', 'marinade', 'spice', 'herb'], category: 'Condiments' },
  { keywords: ['kimchi', 'kefir', 'miso', 'tempeh', 'ferment', 'yogurt'], category: 'Fermented Goods' },
  { keywords: ['chickpea', 'lentil', 'kidney bean', 'black bean', 'white bean', 'pea', 'soybean', 'legume'], category: 'Legumes' },
  { keywords: ['oat', 'wheat', 'rice', 'flour', 'quinoa', 'grain', 'barley', 'millet', 'corn', 'cereal'], category: 'Grains & Cereals' },
  { keywords: ['spinach', 'tomato', 'carrot', 'lettuce', 'kale', 'broccoli', 'onion', 'potato', 'apple', 'banana', 'berry'], category: 'Produce' },
  { keywords: ['oil', 'butter', 'ghee', 'fat', 'lard'], category: 'Oils & Fats' },
  { keywords: ['almond', 'walnut', 'cashew', 'seed', 'chia', 'flax', 'hemp', 'sunflower', 'pumpkin', 'peanut'], category: 'Seeds & Nuts' },
];

export function categorizeItem(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

export function forecastStockout(item: Item, logs: UsageLog[]): ForecastResult {
  if (logs.length === 0) {
    return { days_until_stockout: null, confidence: 'low' };
  }

  const totalUsed = logs.reduce((sum, l) => sum + Number(l.quantity_used), 0);
  const earliest = new Date(logs[0].logged_at).getTime();
  const latest = new Date(logs[logs.length - 1].logged_at).getTime();
  const daySpan = Math.max((latest - earliest) / 86400000, 1);
  const avgDaily = totalUsed / daySpan;

  if (avgDaily <= 0) {
    return { days_until_stockout: null, confidence: 'low' };
  }

  const days = Math.round(Number(item.quantity) / avgDaily);
  const confidence: ForecastResult['confidence'] =
    logs.length >= 7 ? 'high' : logs.length >= 3 ? 'medium' : 'low';

  return { days_until_stockout: days, confidence };
}
