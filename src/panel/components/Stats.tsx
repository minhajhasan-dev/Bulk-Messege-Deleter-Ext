import { numberFormat } from '@/shared/utils/format';
import { useAppStore } from '@/panel/state/store';

export default function Stats() {
  const total = useAppStore((s) => s.threads.length);
  const selected = useAppStore((s) => s.selectedThreadId ? 1 : 0);

  return (
    <div className="grid grid-cols-2 gap-2 p-3 text-center text-xs">
      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-2">
        <div className="text-gray-500">Threads</div>
        <div className="text-lg font-semibold">{numberFormat(total)}</div>
      </div>
      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-2">
        <div className="text-gray-500">Selected</div>
        <div className="text-lg font-semibold">{numberFormat(selected)}</div>
      </div>
    </div>
  );
}
