import type { Filters, Message } from '../store/appStore';

function toMidnight(ts: number): number {
  const d = new Date(ts);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return dd.getTime();
}

export function buildPredicate(filters: Filters): (m: Message) => boolean {
  const fromDateTs = filters.fromDate ? new Date(filters.fromDate).getTime() : null;
  const toDateTsInc = filters.toDate ? new Date(filters.toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
  const kw = (filters.keyword || '').trim().toLowerCase();
  const timeWindow = filters.timeWindow;
  const textOnly = filters.type === 'textOnly';

  return (m: Message) => {
    if (fromDateTs && m.timestamp < fromDateTs) return false;
    if (toDateTsInc && m.timestamp > toDateTsInc) return false;

    if (timeWindow) {
      const mins = new Date(m.timestamp).getHours() * 60 + new Date(m.timestamp).getMinutes();
      const { startMinutes, endMinutes } = timeWindow;
      if (startMinutes <= endMinutes) {
        if (mins < startMinutes || mins > endMinutes) return false;
      } else {
        if (mins > endMinutes && mins < startMinutes) return false;
      }
    }

    if (textOnly && m.hasAttachment) return false;

    if (kw) {
      const hay = `${m.text || ''}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    return m.author === 'me';
  };
}

export function applyFilters(messages: Message[], filters: Filters): Message[] {
  const pred = buildPredicate(filters);
  return messages.filter(pred);
}

export function histogramByDate(messages: Message[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  messages.forEach((m) => {
    const d = new Date(toMidnight(m.timestamp));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}
