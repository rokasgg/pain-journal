import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayLocalDate } from '@/lib/dates';

interface DailyChecklistState {
  date: string;
  checked: Record<string, boolean>;
  toggle: (id: string) => void;
}

export const useDailyChecklistStore = create<DailyChecklistState>()(
  persist(
    (set) => ({
      date: '',
      checked: {},
      toggle: (id) => {
        const today = todayLocalDate();
        set((state) => {
          if (state.date !== today) {
            return { date: today, checked: { [id]: true } };
          }
          return { checked: { ...state.checked, [id]: !state.checked[id] } };
        });
      },
    }),
    {
      name: 'daily-checklist-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
