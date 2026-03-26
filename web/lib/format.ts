export function relativeTime(dateStr: string, now: number = Date.now()): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const diffMs = Math.max(0, now - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 2) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 2) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 2) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US');
}
