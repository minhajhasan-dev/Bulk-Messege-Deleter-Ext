import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/panel/state/store';

export default function ConfirmDialog() {
  const confirm = useAppStore((s) => s.confirm);
  const close = useAppStore((s) => s.closeConfirm);

  const handleConfirm = () => {
    confirm.onConfirm?.();
    close();
  };

  return (
    <AnimatePresence>
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-10 w-[90%] max-w-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div className="text-sm font-semibold mb-1">{confirm.title}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-4">{confirm.message}</div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline" type="button" onClick={close}>{confirm.cancelLabel ?? 'Cancel'}</button>
              <button className="btn btn-primary" type="button" onClick={handleConfirm}>{confirm.confirmLabel ?? 'Confirm'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
