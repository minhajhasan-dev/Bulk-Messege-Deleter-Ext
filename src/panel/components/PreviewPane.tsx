import { motion } from 'framer-motion';
import { useAppStore } from '@/panel/state/store';
import { formatDate } from '@/shared/utils/date';

export default function PreviewPane() {
  const selectedId = useAppStore((s) => s.selectedThreadId);
  const thread = useAppStore((s) => s.threads.find((t) => t.id === s.selectedThreadId));

  if (!selectedId || !thread) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Select a thread to preview
      </div>
    );
  }

  return (
    <motion.div
      key={thread.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full p-4"
    >
      <h2 className="text-base font-semibold mb-1">{thread.title}</h2>
      <div className="text-xs text-gray-500 mb-4">Updated {formatDate(thread.updatedAt)}</div>
      <div className="text-sm leading-6">
        This is a placeholder preview pane. Render conversation details here.
      </div>
    </motion.div>
  );
}
