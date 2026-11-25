import { create } from 'zustand';

// Signals "onboarding just finished" across the root layout's redirect into
// (tabs) — same plain, non-persisted Zustand pattern as useCelebrationStore.
// Home reads it to wait for that fade before presenting the WelcomeGuide's
// real <Modal> (the Modal-vs-navigation race), then consumes it.
interface OnboardingCompleteState {
  pending: boolean;
  markPending: () => void;
  /** Home calls this once it has acted on `pending`. */
  consume: () => void;
}

export const useOnboardingCompleteStore = create<OnboardingCompleteState>((set) => ({
  pending: false,
  markPending: () => set({ pending: true }),
  consume: () => set({ pending: false }),
}));
