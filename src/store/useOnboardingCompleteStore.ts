import { create } from 'zustand';

// Signals "onboarding just finished, Home should show a success checkmark"
// across the router.replace('/(tabs)') navigation — same plain, non-persisted
// Zustand pattern as useCelebrationStore. Needed because the success
// animation must play AFTER the transition into Home lands, not on the
// onboarding screen itself (playing it there and then navigating mid-way cut
// the animation off half-finished, visible during the screen transition).
interface OnboardingCompleteState {
  pending: boolean;
  markPending: () => void;
  /** Home calls this the moment it picks up `pending`, so the checkmark only ever shows once. */
  consume: () => void;
}

export const useOnboardingCompleteStore = create<OnboardingCompleteState>((set) => ({
  pending: false,
  markPending: () => set({ pending: true }),
  consume: () => set({ pending: false }),
}));
