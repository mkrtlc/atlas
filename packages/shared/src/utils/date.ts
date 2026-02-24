export function formatRelativeTime(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return locale ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second').replace(/0\s*/, '') : 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  const loc = locale || 'en-US';
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullDate(dateStr: string, locale?: string): string {
  const loc = locale || 'en-US';
  return new Date(dateStr).toLocaleDateString(loc, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
