import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { sendMessage } from '@/shared/messaging/bus';
import type { LicenseStatus } from '@/shared/license';
import { getLicenseStatus } from '@/shared/license';
import { getOptIn, setOptIn, initTelemetry } from '@/shared/telemetry';

export type Thread = {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: number;
};

export type Toast = { id: string; type: 'success' | 'error' | 'info'; title?: string; message: string };

export type Filters = {
  query: string;
};

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

export type AppState = {
  threads: Thread[];
  selectedThreadId: string | null;
  filters: Filters;
  toasts: Toast[];
  confirm: ConfirmState;
  license: { status: LicenseStatus; daysLeft?: number } | null;
  telemetryOptIn: boolean;

  init: () => Promise<void>;
  setFilter: (patch: Partial<Filters>) => void;
  selectThread: (id: string | null) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  confirmAction: (opts: Omit<ConfirmState, 'open'>) => void;
  closeConfirm: () => void;
  setTelemetryOptIn: (value: boolean) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  threads: Array.from({ length: 25 }, (_, i) => ({
    id: String(i + 1),
    title: `Thread ${i + 1}`,
    lastMessagePreview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    updatedAt: Date.now() - i * 1000 * 60 * 30,
  })),
  selectedThreadId: null,
  filters: { query: '' },
  toasts: [],
  confirm: { open: false, title: '', message: '' },
  license: null,
  telemetryOptIn: false,

  init: async () => {
    await initTelemetry();
    set({ telemetryOptIn: getOptIn() });
    const status = await getLicenseStatus();
    set({ license: status });

    // Ping background to ensure messaging channel works
    try {
      await sendMessage({ type: 'PING', payload: { time: Date.now() } });
    } catch (e) {
      get().addToast({ type: 'error', message: 'Background unreachable' });
    }
  },

  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  selectThread: (id) => set({ selectedThreadId: id }),

  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, { id: uuid(), ...toast }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  confirmAction: (opts) => set({ confirm: { open: true, ...opts } }),
  closeConfirm: () => set((s) => ({ confirm: { ...s.confirm, open: false } })),

  setTelemetryOptIn: async (value) => {
    await setOptIn(value);
    set({ telemetryOptIn: value });
  },
}));
