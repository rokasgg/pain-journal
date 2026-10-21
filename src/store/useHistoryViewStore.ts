import { create } from 'zustand';

export type HistoryView = 'charts' | 'calendar';

// History tab's Charts / Calendar switch. Plain non-persisted store, so the
// last choice survives leaving the tab while the app is open, but a fresh
// launch always opens on Charts.
interface HistoryViewState {
  view: HistoryView;
  setView: (view: HistoryView) => void;
}

export const useHistoryViewStore = create<HistoryViewState>((set) => ({
  view: 'charts',
  setView: (view) => set({ view }),
}));
