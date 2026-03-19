/** Shared formatting utilities — dates, numbers, currency. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  return Number(value).toFixed(decimals);
}

/** Returns a human-friendly "X days" label with urgency cue. */
export function formatDaysLeft(days: number | null): string {
  if (days == null) return 'Unknown';
  if (days <= 0)   return 'Out of stock';
  if (days === 1)  return '1 day';
  return `${days} days`;
}

/** Maps alert_status to a Tailwind colour pair [bg, text]. */
export function alertColours(status: string | undefined): { bg: string; text: string; border: string } {
  switch (status) {
    case 'critical': return { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' };
    case 'warning':  return { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' };
    default:         return { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' };
  }
}
