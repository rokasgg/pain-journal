import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Chat answers the user chose to "add to the physio summary". Per device
// (like useWrapStore) — they only feed the PDF from Insights → Physio, and
// are cleared once that report is shared.
export interface PhysioNote {
  id: string;
  question: string;
  text: string;
  addedAt: string; // yyyy-MM-dd
}

interface PhysioNotesState {
  notes: PhysioNote[];
  addNote: (note: Omit<PhysioNote, 'id'>) => void;
  clear: () => void;
}

export const usePhysioNotesStore = create<PhysioNotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (note) =>
        set((state) =>
          state.notes.some((n) => n.text === note.text)
            ? state
            : { notes: [...state.notes, { ...note, id: `${Date.now()}-${state.notes.length}` }] },
        ),
      clear: () => set({ notes: [] }),
    }),
    { name: 'physio-notes-storage', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
