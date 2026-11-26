import { useMutation } from '@tanstack/react-query';

import { extractFunctionErrorMessage } from '@/lib/functionsError';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';
import type { RoutineExercise } from '@/types/database.types';

type GenerateRoutineSource =
  | { source: 'physio_visit'; physio_visit_id: string }
  | { source: 'manual_input'; input_text: string }
  // Photos of the physio's exercise sheet / notes, as base64 JPEG (resized by
  // pickExercisePhotos). Sent once, never stored.
  | { source: 'images'; images: string[] };

export type GenerateRoutineInput = GenerateRoutineSource & {
  // Still accepted by the edge function; the app no longer sends it, since
  // imported exercises join the library ("My exercises") by name instead.
  carry_forward_exercises?: RoutineExercise[];
};

interface GenerateRoutineResponse {
  routine_title?: string;
  summary?: string;
  exercises?: RoutineExercise[];
  error?: string;
  // 'no_exercises_found': the photos didn't show any readable exercises.
  error_code?: string;
}

export interface RoutineDraft {
  title: string;
  summary: string | null;
  exercises: RoutineExercise[];
}

// One generate-routine call → a draft or an error message. Never throws. Kept
// outside the hook so it can be tested without React Query.
export async function requestRoutineDraft(
  input: GenerateRoutineInput,
  locale: string,
): Promise<{ draft: RoutineDraft | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<GenerateRoutineResponse>('generate-routine', {
    body: { ...input, locale },
  });

  if (error) {
    const message = await extractFunctionErrorMessage(error, error.message);
    return { draft: null, error: message };
  }
  if (data?.error_code === 'no_exercises_found') return { draft: null, error: t('routine.noExercisesFound') };
  if (data?.error) return { draft: null, error: data.error };
  if (!data?.routine_title || !data.exercises) {
    return { draft: null, error: 'Generated routine was invalid — please try again.' };
  }

  return {
    draft: { title: data.routine_title, summary: data.summary ?? null, exercises: data.exercises },
    error: null,
  };
}

// Calls the generate-routine edge function (Claude, server-side). This no
// longer saves anything — it returns a draft for the caller to hand to
// routine/review.tsx, which is what actually creates the `routines` row
// (via useCreateRoutine()) once the user has reviewed/edited it.
export function useGenerateRoutine() {
  const locale = useLocaleStore((s) => s.locale);

  return useMutation({
    mutationFn: (input: GenerateRoutineInput) => requestRoutineDraft(input, locale),
  });
}
