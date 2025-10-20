import React, { useEffect, useMemo, useState } from 'react';
import { onMessageAdd, onMessageRemove, sendMessage } from './extension/shared/extensionApi';

type Filters = {
  fromDate?: string;
  toDate?: string;
  unreadOnly?: boolean;
  includeParticipants?: string[];
  excludeParticipants?: string[];
  keywords?: string[];
  groupOnly?: boolean;
  oneToOneOnly?: boolean;
  minSize?: number | undefined;
  maxSize?: number | undefined;
};

type ThreadMeta = {
  id: string;
  url?: string;
  participants: string[];
  isGroup: boolean;
  unread: boolean;
  lastActivityTs: number | null;
  lastSnippet: string | null;
  sizeEstimate: number | null;
  hasAttachments: boolean | null;
  source?: 'messenger' | 'facebook';
};

function useExtensionState() {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    const onMsg = (m: any) => {
      if (m?.type === 'state') setState(m.payload);
    };
    onMessageAdd(onMsg);
    (async () => {
      try {
        const resp = await sendMessage({ type: 'getState' });
        if ((resp as any)?.ok) setState((resp as any).state);
      } catch {
        // ignore when not in extension context
      }
    })();
    return () => {
      onMessageRemove(onMsg);
    };
  }, []);
  return [state, setState] as const;
}

async function bgMessage(type: string, payload?: any) {
  try {
    return await sendMessage({ type, payload });
  } catch (e) {
    return { ok: false, error: String((e as any)?.message || e) };
  }
}

function parseCSV(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(ts?: number | null) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '-';
  }
}

function App() {
  const [extState] = useExtensionState();

  const [filters, setFilters] = useState<Filters>({});
  const [includeStr, setIncludeStr] = useState('');
  const [excludeStr, setExcludeStr] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(1);

  const selectedCount = extState?.selectedIds?.length || 0;
  const scanned = extState?.progress?.scanned || 0;
  const deleted = extState?.progress?.deleted || 0;
  const totalToDelete = extState?.progress?.totalToDelete || 0;
  const status = extState?.status || 'idle';

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      includeParticipants: parseCSV(includeStr),
      excludeParticipants: parseCSV(excludeStr),
      keywords: parseCSV(keywordsStr),
    }));
  }, [includeStr, excludeStr, keywordsStr]);

  const onStartScan = async () => {
    await bgMessage('startScan', { filters });
  };

  const onApplyFilters = async () => {
    await bgMessage('applyFilters', { filters });
  };

  const onDelete = async () => {
    await bgMessage('deleteSelected', { dryRun, batchSize });
  };

  const site = extState?.site || 'unknown';

  const statusLabel = useMemo(() => {
    if (status === 'scanning') return 'Scanning conversations...';
    if (status === 'deleting') return (dryRun ? 'Previewing deletions...' : 'Deleting conversations...');
    return 'Idle';
  }, [status, dryRun]);

  return (
    <div className="p-4 w-[380px]">
      <h1 className="text-xl font-bold">Bulk Message Deleter</h1>
      <p className="mt-1 text-xs text-gray-500">Target site: {site}</p>

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            From date
            <input type="date" className="mt-1 w-full border rounded px-2 py-1 text-sm"
              value={filters.fromDate || ''} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
          </label>
          <label className="text-xs">
            To date
            <input type="date" className="mt-1 w-full border rounded px-2 py-1 text-sm"
              value={filters.toDate || ''} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={!!filters.unreadOnly} onChange={(e) => setFilters({ ...filters, unreadOnly: e.target.checked })} />
            Unread only
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={!!filters.groupOnly} onChange={(e) => setFilters({ ...filters, groupOnly: e.target.checked, oneToOneOnly: false })} />
              Groups only
            </label>
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={!!filters.oneToOneOnly} onChange={(e) => setFilters({ ...filters, oneToOneOnly: e.target.checked, groupOnly: false })} />
              1:1 only
            </label>
          </div>
        </div>
        <label className="text-xs block">
          Include participants (comma separated)
          <input className="mt-1 w-full border rounded px-2 py-1 text-sm" placeholder="alice,bob"
            value={includeStr} onChange={(e) => setIncludeStr(e.target.value)} />
        </label>
        <label className="text-xs block">
          Exclude participants (comma separated)
          <input className="mt-1 w-full border rounded px-2 py-1 text-sm" placeholder="spam"
            value={excludeStr} onChange={(e) => setExcludeStr(e.target.value)} />
        </label>
        <label className="text-xs block">
          Keywords (comma separated)
          <input className="mt-1 w-full border rounded px-2 py-1 text-sm" placeholder="invoice,project"
            value={keywordsStr} onChange={(e) => setKeywordsStr(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Min size
            <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-1 text-sm"
              value={filters.minSize ?? ''} onChange={(e) => setFilters({ ...filters, minSize: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
          <label className="text-xs">
            Max size
            <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-1 text-sm"
              value={filters.maxSize ?? ''} onChange={(e) => setFilters({ ...filters, maxSize: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onStartScan} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50" disabled={status !== 'idle'}>
          Start Scan
        </button>
        <button type="button" onClick={onApplyFilters} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm">
          Apply Filters
        </button>
      </div>

      <div className="mt-3 border-t pt-3">
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry-run
          </label>
          <label className="flex items-center gap-2">
            Batch size
            <input type="number" min={1} max={3} className="w-16 border rounded px-2 py-1 text-sm" value={batchSize} onChange={(e) => setBatchSize(Math.min(3, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50" disabled={!selectedCount || status !== 'idle'}>
            {dryRun ? 'Preview Delete' : 'Delete Selected'} ({selectedCount})
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-600">
        <div>Status: {statusLabel}</div>
        <div>Scanned: {scanned}</div>
        <div>Selected: {selectedCount}</div>
        <div>Deleted: {deleted} / {totalToDelete}</div>
      </div>

      {extState?.threads?.length ? (
        <div className="mt-3 max-h-56 overflow-auto border rounded">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-1">Participants</th>
                <th className="text-left p-1">Unread</th>
                <th className="text-left p-1">Last</th>
              </tr>
            </thead>
            <tbody>
              {extState.threads.slice(0, 50).map((t: ThreadMeta) => (
                <tr key={t.id} className="border-t">
                  <td className="p-1">{t.participants.join(', ')}</td>
                  <td className="p-1">{t.unread ? 'Yes' : 'No'}</td>
                  <td className="p-1">{formatDate(t.lastActivityTs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {extState.threads.length > 50 ? (
            <div className="p-2 text-center text-[10px] text-gray-500">Showing first 50 of {extState.threads.length}</div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">Open messenger.com or facebook.com/messages in a tab, then click Start Scan.</p>
      )}

      {extState?.errors?.length ? (
        <div className="mt-3 text-[11px] text-red-600">
          <div className="font-semibold">Errors</div>
          <ul className="list-disc pl-5">
            {extState.errors.slice(-5).map((e: string, i: number) => (
              <li key={`${i}-${e.slice(0, 12)}`}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default App;
