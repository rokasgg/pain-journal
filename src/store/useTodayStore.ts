import { create } from 'zustand';

import { todayLocalDate } from '@/lib/dates';

interface TodayState {
  // The local calendar day ("yyyy-MM-dd") the app currently treats as today.
  today: string;
  // When the clock was last read (ms). Changes on every resume and at the
  // day's boundaries (midnight, evening unlock), so hour-based UI such as
  // "is the evening check-in open?" re-renders then too.
  clock: number;
  // Re-reads the clock (and the day).
  refresh: () => void;
}

// Reactive "today". `todayLocalDate()` is a plain function: called during
// render it never updates by itself (and the React Compiler caches it), so an
// app left in the background overnight kept showing yesterday's check-ins.
// Render code reads `useToday()` / `clock` instead; `useAppLifecycle`
// refreshes them on resume and at midnight / the evening unlock. Event
// handlers and mutations can keep calling `todayLocalDate()`, since they read
// the clock at the moment they run.
export const useTodayStore = create<TodayState>((set) => ({
  today: todayLocalDate(),
  clock: Date.now(),
  refresh: () => set({ today: todayLocalDate(), clock: Date.now() }),
}));

export function useToday(): string {
  return useTodayStore((s) => s.today);
}
