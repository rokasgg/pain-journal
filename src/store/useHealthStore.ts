import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Settings → "Apple Health". Our own flag, per device: HealthKit never tells an
// app whether reading was denied, so "connected" means the user turned this
// on and the permission sheet was shown (src/lib/health/healthkit.ts).
interface HealthState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'health-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
