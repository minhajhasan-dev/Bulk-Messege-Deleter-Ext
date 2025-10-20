import { create } from 'zustand';

export type Person = {
  id: string;
  name: string;
  avatarUrl?: string;
  threadId?: string;
  lastActivityTs?: number | null;
  unread?: boolean;
};

export type Message = {
  id: string;
  author: 'me' | 'them' | string;
  text?: string;
  hasAttachment?: boolean;
  timestamp: number; // ms epoch
};

export type MessageType = 'textOnly' | 'includeAttachments';

export type Filters = {
  fromDate?: string; // yyyy-mm-dd
  toDate?: string; // yyyy-mm-dd
  timeWindow?: { startMinutes: number; endMinutes: number } | null; // minutes since midnight
  keyword?: string; // case-insensitive contains
  type?: MessageType;
};

export type PreviewStats = {
  count: number;
  histogram: { date: string; count: number }[];
  samples: Message[];
};

export type RunState = 'idle' | 'previewing' | 'running' | 'paused' | 'error' | 'done';

export type LogEntry = { ts: number; level: 'info' | 'warn' | 'error'; message: string };

export type AppState = {
  people: Person[];
  loadingPeople: boolean;
  searchQuery: string;
  selectedPerson: Person | null;
  filters: Filters;
  matchedMessages: Message[];
  previewStats: PreviewStats | null;
  runState: RunState;
  progress: { processed: number; deleted: number; total: number };
  logs: LogEntry[];

  setPeople: (p: Person[]) => void;
  setLoadingPeople: (b: boolean) => void;
  setSearchQuery: (q: string) => void;
  setSelectedPerson: (p: Person | null) => void;
  setFilters: (f: Filters) => void;
  setMatchedMessages: (m: Message[]) => void;
  setPreviewStats: (s: PreviewStats | null) => void;
  setRunState: (s: RunState) => void;
  setProgress: (p: { processed: number; deleted: number; total: number }) => void;
  addLog: (l: LogEntry) => void;
  resetRun: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  people: [],
  loadingPeople: false,
  searchQuery: '',
  selectedPerson: null,
  filters: { type: 'includeAttachments', timeWindow: null },
  matchedMessages: [],
  previewStats: null,
  runState: 'idle',
  progress: { processed: 0, deleted: 0, total: 0 },
  logs: [],

  setPeople: (p) => set({ people: p }),
  setLoadingPeople: (b) => set({ loadingPeople: b }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedPerson: (p) => set({ selectedPerson: p }),
  setFilters: (f) => set({ filters: f }),
  setMatchedMessages: (m) => set({ matchedMessages: m }),
  setPreviewStats: (s) => set({ previewStats: s }),
  setRunState: (s) => set({ runState: s }),
  setProgress: (p) => set({ progress: p }),
  addLog: (l) => set((st) => ({ logs: [...st.logs.slice(-200), l] })),
  resetRun: () => set({ runState: 'idle', progress: { processed: 0, deleted: 0, total: 0 }, matchedMessages: [], previewStats: null }),
}));
