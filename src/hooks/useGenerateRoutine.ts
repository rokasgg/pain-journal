import { useMutation } from '@tanstack/react-query';

import { extractFunctionErrorMessage } from '@/lib/functionsError';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';
import type { RoutineExercise } from '@/types/database.types';

type GenerateRoutineSource =
  | { source: 'physio_visit'; physio_visit_id: string }
  | { source: 'manual_input'; input_text: string };

export type GenerateRoutineInput = GenerateRoutineSource & {
  // Exercises from the user's current routine to keep verbatim in the new
  // one — see routine/new.tsx's carry-forward checklist.
  carry_forward_exercises?: RoutineExercise[];
};

interface GenerateRoutineResponse {
  routine_title?: string;
  summary?: string;
  exercises?: RoutineExercise[];
  error?: string;
}

export interface RoutineDraft {
  title: string;
  summary: string | null;
  exercises: RoutineExercise[];
}

// Calls the generate-routine edge function (Claude, server-side). This no
// longer saves anything — it returns a draft for the caller to hand to
// routine/review.tsx, which is what actually creates the `routines` row
// (via useCreateRoutine()) once the user has reviewed/edited it.
export function useGenerateRoutine() {
  const locale = useLocaleStore((s) => s.locale);

  return useMutation({
    mutationFn: async (
      input: GenerateRoutineInput,
    ): Promise<{ draft: RoutineDraft | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<GenerateRoutineResponse>('generate-routine', {
        body: { ...input, locale },
      });

      if (error) {
        const message = await extractFunctionErrorMessage(error, error.message);
        return { draft: null, error: message };
      }
      if (data?.error) return { draft: null, error: data.error };
      if (!data?.routine_title || !data.exercises) {
        return { draft: null, error: 'Generated routine was invalid — please try again.' };
      }

      return {
        draft: { title: data.routine_title, summary: data.summary ?? null, exercises: data.exercises },
        error: null,
      };
    },
  });
}
