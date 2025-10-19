import { motion } from 'framer-motion';
import { useAppStore } from '@/panel/state/store';

export default function Header() {
  const license = useAppStore((s) => s.license);
  const telemetryOptIn = useAppStore((s) => s.telemetryOptIn);
  const setTelemetryOptIn = useAppStore((s) => s.setTelemetryOptIn);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-3 py-2">
      <div className="flex items-center gap-2">
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-sm font-semibold">Side Panel Toolkit</h1>
        </motion.div>
        {license && (
          <span className="ml-2 inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
            {license.status === 'licensed' && 'Licensed'}
            {license.status === 'trial' && `Trial · ${license.daysLeft ?? 0} days left`}
            {license.status === 'expired' && 'Trial expired'}
          </span>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 select-none">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-gray-300 dark:border-gray-700"
          checked={telemetryOptIn}
          onChange={(e) => setTelemetryOptIn(e.target.checked)}
        />
        Share anonymous telemetry
      </label>
    </header>
  );
}
