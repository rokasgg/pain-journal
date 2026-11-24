import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// User's "Sounds" setting. Read non-reactively by src/utils/sounds.ts via
// getState(), the same way haptics reads useHapticsStore.
interface SoundState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'sound-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
