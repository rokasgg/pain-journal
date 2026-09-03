import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { extractFunctionErrorMessage } from '@/lib/functionsError';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';
import type { Routine } from '@/types/database.types';

export type GenerateRoutineInput =
  | { source: 'physio_visit'; physio_visit_id: string }
  | { source: 'manual_input'; input_text: string };

interface GenerateRoutineResponse {
  routine?: Routine;
  summary?: string;
  error?: string;
}

// Calls the generate-routine edge function (Claude, server-side) — this is
// the only way a `routines` row ever gets created, no manual-entry form.
export function useGenerateRoutine() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);

  return useMutation({
    mutationFn: async (
      input: GenerateRoutineInput,
    ): Promise<{ routine: Routine | null; summary: string | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<GenerateRoutineResponse>('generate-routine', {
        body: { ...input, locale },
      });

      if (error) {
        const message = await extractFunctionErrorMessage(error, error.message);
        return { routine: null, summary: null, error: message };
      }
      if (data?.error) return { routine: null, summary: null, error: data.error };

      return { routine: data?.routine ?? null, summary: data?.summary ?? null, error: null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines', 'active', user?.id] });
    },
  });
}
