import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// User's "Vibration" setting. Read non-reactively by src/utils/haptics.ts via
// getState(), so haptics also work from non-component code (toast.ts etc).
interface HapticsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHapticsStore = create<HapticsState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'haptics-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
