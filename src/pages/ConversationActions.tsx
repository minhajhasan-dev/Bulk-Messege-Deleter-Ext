import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, Filters } from '../store/appStore';
import { applyFilters, histogramByDate } from '../logic/filters';
import { sendMessage } from '../extension/shared/extensionApi';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-3 py-2 border rounded">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function ConversationActions() {
  const { selectedPerson, filters, setFilters, matchedMessages, setMatchedMessages, previewStats, setPreviewStats, setRunState, progress, setProgress } = useAppStore();

  const onChangeFilters = useCallback(
    (patch: Partial<Filters>) => setFilters({ ...filters, ...patch }),
    [filters, setFilters],
  );

  const onPreview = useCallback(async () => {
    if (!selectedPerson) return;
    setRunState('previewing');
    const resp = (await sendMessage({ type: 'getMessagesForUser', payload: { userId: selectedPerson.id } })) as any;
    const msgs = Array.isArray(resp?.messages) ? resp.messages : [];
    const filtered = applyFilters(msgs, filters);
    setMatchedMessages(filtered);
    setPreviewStats({ count: filtered.length, histogram: histogramByDate(filtered), samples: filtered.slice(0, 10) });
    setProgress({ processed: 0, deleted: 0, total: filtered.length });
    setRunState('idle');
  }, [filters, selectedPerson, setRunState, setMatchedMessages, setPreviewStats, setProgress]);

  const onExport = useCallback(() => {
    const lines = ['id,author,timestamp,text'];
    matchedMessages.forEach((m) => {
      const text = (m.text || '').replace(/"/g, '""');
      lines.push(`${m.id},${m.author},${m.timestamp},"${text}"`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${selectedPerson?.name || 'user'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [matchedMessages, selectedPerson]);

  const histogram = previewStats?.histogram || [];

  const timeWindowLabel = useMemo(() => {
    const tw = filters.timeWindow;
    if (!tw) return 'Any time';
    const fmt = (m: number) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    return `${fmt(tw.startMinutes)} - ${fmt(tw.endMinutes)}`;
  }, [filters.timeWindow]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <div className="text-sm font-semibold">{selectedPerson?.name}</div>
        <div className="text-[10px] text-gray-500">Configure filters and preview matches</div>
      </div>
      <div className="p-2 grid grid-cols-2 gap-2 border-b">
        <label className="text-xs">
          From
          <input type="date" className="mt-1 w-full border rounded px-2 py-1 text-sm" value={filters.fromDate || ''} onChange={(e) => onChangeFilters({ fromDate: e.target.value })} />
        </label>
        <label className="text-xs">
          To
          <input type="date" className="mt-1 w-full border rounded px-2 py-1 text-sm" value={filters.toDate || ''} onChange={(e) => onChangeFilters({ toDate: e.target.value })} />
        </label>
        <label className="text-xs col-span-2">
          Keyword contains
          <input className="mt-1 w-full border rounded px-2 py-1 text-sm" placeholder="search text" value={filters.keyword || ''} onChange={(e) => onChangeFilters({ keyword: e.target.value })} />
        </label>
        <div className="text-xs col-span-2 flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="radio" name="msgtype" checked={(filters.type || 'includeAttachments') === 'includeAttachments'} onChange={() => onChangeFilters({ type: 'includeAttachments' })} />
            Include attachments
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="msgtype" checked={filters.type === 'textOnly'} onChange={() => onChangeFilters({ type: 'textOnly' })} />
            Text only
          </label>
        </div>
        <div className="text-xs col-span-2">
          <div className="font-medium mb-1">Time window</div>
          <div className="flex items-center gap-2">
            <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => onChangeFilters({ timeWindow: null })}>Any time</button>
            <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => onChangeFilters({ timeWindow: { startMinutes: 8 * 60, endMinutes: 18 * 60 } })}>08:00 - 18:00</button>
            <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => onChangeFilters({ timeWindow: { startMinutes: 20 * 60, endMinutes: 6 * 60 } })}>20:00 - 06:00</button>
            <div className="text-[10px] text-gray-500">Current: {timeWindowLabel}</div>
          </div>
        </div>
      </div>
      <div className="p-2 grid grid-cols-3 gap-2 border-b">
        <Stat label="Matched" value={previewStats?.count || 0} />
        <Stat label="To delete" value={matchedMessages.length} />
        <Stat label="Progress" value={`${progress.deleted}/${progress.total}`} />
      </div>
      <div className="p-2 border-b">
        <button type="button" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm" onClick={onPreview}>
          Preview matches
        </button>
        {matchedMessages.length ? (
          <button type="button" className="ml-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm" onClick={onExport}>Export CSV</button>
        ) : null}
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {histogram.map((b) => (
          <motion.div key={b.date} layout className="text-xs flex items-center gap-2">
            <div className="w-24 text-gray-600">{b.date}</div>
            <div className="flex-1 h-2 bg-gray-100 rounded">
              <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, 5 + b.count)}%` }} />
            </div>
            <div className="w-8 text-right">{b.count}</div>
          </motion.div>
        ))}
        {!histogram.length ? <div className="text-xs text-gray-500">No matches yet</div> : null}
      </div>
    </div>
  );
}
