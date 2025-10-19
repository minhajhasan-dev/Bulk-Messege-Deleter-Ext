import { useAppStore } from '@/panel/state/store';
import { downloadCsv, toCsv } from '@/shared/utils/csv';

export default function ActionBar() {
  const threads = useAppStore((s) => s.threads);
  const confirm = useAppStore((s) => s.confirmAction);
  const addToast = useAppStore((s) => s.addToast);

  const exportCsv = () => {
    const csv = toCsv(
      threads.map((t) => ({ id: t.id, title: t.title, preview: t.lastMessagePreview, updatedAt: t.updatedAt })),
    );
    downloadCsv('threads.csv', csv);
    addToast({ type: 'success', message: 'Exported CSV' });
  };

  const deleteSelected = () => {
    confirm({
      title: 'Delete selected',
      message: 'This is a placeholder confirmation dialog.',
      confirmLabel: 'Delete',
      onConfirm: () => addToast({ type: 'info', message: 'Deleted (placeholder)' }),
    });
  };

  return (
    <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800 p-3">
      <button className="btn btn-outline" type="button" onClick={exportCsv}>Export CSV</button>
      <button className="btn btn-primary" type="button" onClick={deleteSelected}>Delete</button>
    </div>
  );
}
