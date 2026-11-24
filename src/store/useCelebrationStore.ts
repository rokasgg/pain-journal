import { create } from 'zustand';

import type { CheckinCelebration } from '@/lib/checkinCelebration';

// When the watering drop lands on the oak (WateringCelebrationHost). The
// oak's watered state, the "droplets" haptic and the chime all start here.
export const DROP_LAND_MS = 1350 * Math.sqrt(0.8);

// The "check-in complete" screen. Plain non-persisted store (like
// useOnboardingCompleteStore), so the check-in screen can hand over what was
// earned and pop underneath it. It stays up until the user taps Continue.
interface CelebrationState {
  visible: boolean;
  celebration: CheckinCelebration | null;
  show: (celebration: CheckinCelebration) => void;
  hide: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  visible: false,
  celebration: null,
  show: (celebration) => set({ visible: true, celebration }),
  hide: () => set({ visible: false }),
}));
