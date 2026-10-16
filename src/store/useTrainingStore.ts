import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_REMEMBERED_WEEKS = 12;

// Per-device memory of which weeks already got the "weekly goal reached"
// success haptic, so it fires once per week rather than on every Home render.
interface TrainingState {
  celebratedWeeks: string[]; // Monday yyyy-MM-dd keys
  markCelebrated: (weekStart: string) => void;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      celebratedWeeks: [],
      markCelebrated: (weekStart) =>
        set((state) =>
          state.celebratedWeeks.includes(weekStart)
            ? state
            : { celebratedWeeks: [...state.celebratedWeeks, weekStart].slice(-MAX_REMEMBERED_WEEKS) },
        ),
    }),
    {
      name: 'training-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
