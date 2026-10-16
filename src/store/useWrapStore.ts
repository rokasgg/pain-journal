import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Per-device "already opened" flags for Monthly Wraps — only decides whether
// Home's "Your Wrap is ready" card still shows, so it doesn't need the DB.
interface WrapState {
  seenMonths: string[];
  markSeen: (month: string) => void;
}

export const useWrapStore = create<WrapState>()(
  persist(
    (set) => ({
      seenMonths: [],
      markSeen: (month) =>
        set((state) => (state.seenMonths.includes(month) ? state : { seenMonths: [...state.seenMonths, month] })),
    }),
    {
      name: 'wrap-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
