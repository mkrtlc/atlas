export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatDate(dateStr: string, monthFormat: 'long' | 'short' = 'long'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: monthFormat, day: 'numeric' });
}

export const STATUS_COLORS: Record<string, string> = {
  paid: '#16a34a',
  draft: '#6b7280',
  sent: '#2563eb',
  overdue: '#dc2626',
  cancelled: '#9ca3af',
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status?.toLowerCase()] || '#6b7280';
}

export function capitalizeStatus(status: string): string {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
