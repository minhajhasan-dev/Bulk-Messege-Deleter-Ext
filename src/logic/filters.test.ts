import { describe, it, expect } from 'vitest';
import { applyFilters, buildPredicate, histogramByDate } from './filters';
import type { Message } from '../store/appStore';

const baseTs = new Date('2023-05-01T12:00:00Z').getTime();

const msgs: Message[] = [
  { id: '1', author: 'me', text: 'hello world', hasAttachment: false, timestamp: baseTs },
  { id: '2', author: 'me', text: 'photo from trip', hasAttachment: true, timestamp: baseTs + 60_000 },
  { id: '3', author: 'them', text: 'reply', hasAttachment: false, timestamp: baseTs + 120_000 },
  { id: '4', author: 'me', text: 'night msg', hasAttachment: false, timestamp: new Date('2023-05-02T02:00:00Z').getTime() },
];

describe('filters', () => {
  it('filters by author me only and keyword', () => {
    const pred = buildPredicate({ keyword: 'hello' });
    const out = msgs.filter(pred);
    expect(out.map((m) => m.id)).toEqual(['1']);
  });

  it('filters by textOnly', () => {
    const out = applyFilters(msgs, { type: 'textOnly' });
    expect(out.map((m) => m.id)).toEqual(['1', '4']);
  });

  it('filters by date range inclusive', () => {
    const out = applyFilters(msgs, { fromDate: '2023-05-02', toDate: '2023-05-02' });
    expect(out.map((m) => m.id)).toEqual(['4']);
  });

  it('filters by time window including overnight', () => {
    const out = applyFilters(msgs, { timeWindow: { startMinutes: 22 * 60, endMinutes: 6 * 60 } });
    expect(out.map((m) => m.id)).toEqual(['4']);
  });

  it('histogram groups by day', () => {
    const filtered = applyFilters(msgs, { type: 'includeAttachments' });
    const hist = histogramByDate(filtered);
    expect(hist[0].date).toMatch(/^2023-05-0/);
    expect(hist.reduce((a, b) => a + b.count, 0)).toBe(filtered.length);
  });
});
