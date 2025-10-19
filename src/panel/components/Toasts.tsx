import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/panel/state/store';

function ToastItem({ id, type, message }: { id: string; type: 'success' | 'error' | 'info'; message: string }) {
  const remove = useAppStore((s) => s.removeToast);
  useEffect(() => {
    const t = setTimeout(() => remove(id), 3000);
    return () => clearTimeout(t);
  }, [id, remove]);

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`${bg} text-white rounded-md px-3 py-2 text-sm shadow`}
    >
      {message}
    </motion.div>
  );
}

export default function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div className="fixed bottom-3 left-3 flex flex-col gap-2 z-50">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} type={t.type} message={t.message} />
        ))}
      </AnimatePresence>
    </div>
  );
}
