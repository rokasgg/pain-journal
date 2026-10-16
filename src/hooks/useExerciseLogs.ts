import { subDays } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { isToday } from '@/lib/dates';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { CompletedExercise, ExerciseLog, ExerciseLogStatus } from '@/types/database.types';

// Recent exercise_logs across all of the user's routines (not scoped to one
// routine_id like useTodayExerciseLog) — used to drive the Home streak
// calendar's "which days did I do my routine" view.
export function useExerciseLogHistory(days = 7) {
  const { user } = useSession();
  const since = subDays(new Date(), days).toISOString();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['exerciseLogs', 'history', user?.id, days],
    queryFn: async (): Promise<ExerciseLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExerciseLog[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { logs: logs ?? [], isLoading };
}

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

// Same idea as useTodayExerciseLog, but across every routine currently in
// rotation rather than one specific routine — used by the evening check-in's
// RoutineTrainingStep to answer "has anything been logged today?" before
// deciding whether to show a routine picker. A user is assumed to log at
// most one routine per day (see the routines-in-rotation plan), so this
// intentionally returns a single log, not one per routine.
export function useTodayExerciseLogForAny(routineIds: string[]) {
  const { user } = useSession();
  const key = [...routineIds].sort().join(',');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['exerciseLogs', 'recentForAny', user?.id, key],
    queryFn: async (): Promise<ExerciseLog[]> => {
      if (!user || routineIds.length === 0) return [];
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('routine_id', routineIds)
        .order('logged_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ExerciseLog[];
    },
    enabled: !!user && routineIds.length > 0,
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
      pain_before?: number | null;
      pain_after?: number | null;
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
