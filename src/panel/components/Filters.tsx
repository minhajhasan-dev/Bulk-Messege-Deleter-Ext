import { useAppStore } from '@/panel/state/store';

export default function Filters() {
  const query = useAppStore((s) => s.filters.query);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-800">
      <input
        value={query}
        onChange={(e) => setFilter({ query: e.target.value })}
        placeholder="Search threads..."
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}
