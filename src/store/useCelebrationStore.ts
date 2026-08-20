import { create } from 'zustand';

const WATERING_DURATION_MS = 1800;

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
