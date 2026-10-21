import type { RefObject } from 'react';
import type { View } from 'react-native';
import { create } from 'zustand';

export interface OakBadgeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Where the Home header's oak circle is, so the post-check-in watering
// screen can fly its oak into it. Plain non-persisted store (like
// useCelebrationStore): the badge registers its circle's ref on mount.
interface OakBadgeState {
  target: RefObject<View | null> | null;
  setTarget: (target: RefObject<View | null> | null) => void;
  // null when the badge isn't mounted or not measurable.
  measure: () => Promise<OakBadgeRect | null>;
}

export const useOakBadgeStore = create<OakBadgeState>((set, get) => ({
  target: null,
  setTarget: (target) => set({ target }),
  measure: () =>
    new Promise((resolve) => {
      const view = get().target?.current;
      if (!view) return resolve(null);
      view.measureInWindow((x, y, width, height) => resolve(width > 0 ? { x, y, width, height } : null));
    }),
}));
