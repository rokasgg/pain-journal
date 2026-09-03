import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { isToday } from '@/lib/dates';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { CompletedExercise, ExerciseLog, ExerciseLogStatus } from '@/types/database.types';

// Finds today's exercise_logs row for a routine, if any. Fetches the last
// few logs and filters by local calendar day client-side rather than a
// logged_at date-range query — logged_at is a timestamptz, and a UTC range
// query can miscount near midnight (same reasoning as todayLocalDate()).
export function useTodayExerciseLog(routineId: string | undefined) {
  const { user } = useSession();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['exerciseLogs', 'recent', user?.id, routineId],
    queryFn: async (): Promise<ExerciseLog[]> => {
      if (!user || !routineId) return [];
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('routine_id', routineId)
        .order('logged_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ExerciseLog[];
    },
    enabled: !!user && !!routineId,
    staleTime: 30_000,
  });

  const log = (logs ?? []).find((entry) => isToday(entry.logged_at)) ?? null;

  return { log, isLoading };
}

export function useCreateExerciseLog() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      routine_id: string;
      status: ExerciseLogStatus;
      completed_exercises: CompletedExercise[];
      general_note: string | null;
    }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase.from('exercise_logs').insert({ ...input, user_id: user.id });
      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
    },
  });
}

// Used by the evening check-in's "already logged today — anything extra?"
// path to append a follow-up note, without creating a second log row for
// the same day.
export function useAppendExerciseLogNote() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; general_note: string }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('exercise_logs')
        .update({ general_note: input.general_note })
        .eq('id', input.id)
        .eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
    },
  });
}
