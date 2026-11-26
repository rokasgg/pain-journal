import { create } from 'zustand';

import type { CheckinCelebration } from '@/lib/checkinCelebration';

// The peak of the check-in moment (CheckinSkyScene): the sun reaches the top
// or the moon settles. The oak reacts, and the host's "checkin" haptic, the
// chime and the headline all land here; later phases key off it.
export const CELEBRATION_PEAK_MS = 1100;

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
