import { create } from 'zustand';

import type { TrainingCelebration } from '@/components/oak/oakConfig';

// The "routine complete" moment after a logged workout (TrainingCelebrationHost).
// Plain non-persisted store, like useCelebrationStore, so training/log.tsx can
// hand over what to show and pop underneath it.
interface TrainingCelebrationState {
  celebration: TrainingCelebration | null;
  show: (celebration: TrainingCelebration) => void;
  hide: () => void;
}

export const useTrainingCelebrationStore = create<TrainingCelebrationState>((set) => ({
  celebration: null,
  show: (celebration) => set({ celebration }),
  hide: () => set({ celebration: null }),
}));
