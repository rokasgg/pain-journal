import { subDays } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { countWaterings } from '@/components/oak/oakConfig';
import { useSession } from '@/hooks/useSession';
import { isToday } from '@/lib/dates';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { CompletedExercise, ExerciseLog, ExerciseLogStatus } from '@/types/database.types';

// Recent exercise_logs — the Home weekly-goal card, findings, Wrap, the
// flare-up detective, the chat and the visit PDF all read this.
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

// Today's training log, if any (any preset or none). Fetches the last few
// logs and filters by local calendar day client-side rather than a logged_at
// date-range query — logged_at is a timestamptz, and a UTC range query can
// miscount near midnight (same reasoning as todayLocalDate()). One workout
// a day is assumed; a later one appends a note instead of a second row.
export function useTodayTrainingLog() {
  const { user } = useSession();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['exerciseLogs', 'recent', user?.id],
    queryFn: async (): Promise<ExerciseLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ExerciseLog[];
    },
    enabled: !!user,
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
      routine_id: string | null;
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

// The training oak's waterings: distinct local days with a logged workout,
// over all time (only `logged_at`, so it stays small). Refreshed by the same
// ['exerciseLogs'] invalidation as everything else here.
export function useOakWaterings() {
  const { user } = useSession();

  const { data: loggedAts, isLoading } = useQuery({
    queryKey: ['exerciseLogs', 'waterings', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase.from('exercise_logs').select('logged_at').eq('user_id', user.id);
      if (error) throw error;
      return ((data ?? []) as { logged_at: string }[]).map((row) => row.logged_at);
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  if (!loggedAts) return { waterings: null, wateredToday: false, isLoading };
  return {
    waterings: countWaterings(loggedAts),
    wateredToday: loggedAts.some((ts) => isToday(ts)),
    isLoading,
  };
}
