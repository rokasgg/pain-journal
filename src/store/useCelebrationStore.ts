import { create } from 'zustand';

// When the watering drop lands on the oak (WateringCelebrationHost): the
// oak's watered state (1.5 s, see OakTree) starts here, so the overlay stays
// up until it has finished, plus a short beat.
export const DROP_LAND_MS = 1350 * Math.sqrt(0.8);
const OAK_WATERED_MS = 1500;
const WATERING_DURATION_MS = Math.round(DROP_LAND_MS + OAK_WATERED_MS + 200);

interface CelebrationState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  visible: false,
  show: () => {
    set({ visible: true });
    setTimeout(() => set({ visible: false }), WATERING_DURATION_MS);
  },
  hide: () => set({ visible: false }),
}));
