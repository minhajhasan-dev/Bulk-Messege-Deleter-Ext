import { useMemo } from 'react';
import { useAppStore } from '@/panel/state/store';
import { formatDate, now } from '@/shared/utils/date';
import { truncate } from '@/shared/utils/format';

export default function ThreadList() {
  const threads = useAppStore((s) => s.threads);
  const query = useAppStore((s) => s.filters.query);
  const selectedId = useAppStore((s) => s.selectedThreadId);
  const select = useAppStore((s) => s.selectThread);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q) || t.lastMessagePreview.toLowerCase().includes(q));
  }, [threads, query]);

  if (!filtered.length) {
    return (
      <div className="p-6 text-sm text-gray-500">No threads found</div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
      {filtered.map((t) => (
        <li
          key={t.id}
          className={`cursor-pointer px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedId === t.id ? 'bg-gray-100 dark:bg-gray-800/60' : ''}`}
          onClick={() => select(t.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') select(t.id); }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{t.title}</div>
            <div className="text-xs text-gray-500">{formatDate(t.updatedAt || now())}</div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{truncate(t.lastMessagePreview, 80)}</div>
        </li>
      ))}
    </ul>
  );
}
