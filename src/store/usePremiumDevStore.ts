import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Dev-only override for testing the Free/Premium gates without a sandbox
// purchase (like skipAuthForDev). Ignored outside __DEV__ by usePremium().
// Toggled by long-pressing the Premium row in Settings.
export type PremiumDevOverride = 'off' | 'free' | 'premium';

interface PremiumDevState {
  override: PremiumDevOverride;
  cycle: () => void;
}

const NEXT: Record<PremiumDevOverride, PremiumDevOverride> = { off: 'free', free: 'premium', premium: 'off' };

export const usePremiumDevStore = create<PremiumDevState>()(
  persist(
    (set) => ({
      override: 'off',
      cycle: () => set((s) => ({ override: NEXT[s.override] })),
    }),
    {
      name: 'premium-dev-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
