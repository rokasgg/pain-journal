import { create } from 'zustand';

import type { RoutineExercise } from '@/types/database.types';

export interface PendingRoutineDraft {
  title: string;
  exercises: RoutineExercise[];
  physioVisitId: string | null;
}

// Plain non-persisted Zustand store, same pattern as useCelebrationStore/
// useOnboardingCompleteStore — hands the just-generated routine draft from
// routine/new.tsx to routine/review.tsx without serializing it through a URL
// param. Nothing is saved to `routines` until the review screen's Save
// button calls useCreateRoutine().
interface PendingRoutineDraftState {
  draft: PendingRoutineDraft | null;
  setDraft: (draft: PendingRoutineDraft) => void;
  clearDraft: () => void;
}

export const usePendingRoutineDraftStore = create<PendingRoutineDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
