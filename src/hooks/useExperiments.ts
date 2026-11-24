import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { useSession } from '@/hooks/useSession';
import { todayLocalDate } from '@/lib/dates';
import {
  experimentDayStates,
  experimentResult,
  isFinished,
  isRunning,
  plannedEnd,
  type DayState,
  type ExperimentResult,
} from '@/lib/experimentResult';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Experiment, ExperimentDay } from '@/types/database.types';
import { useToday } from '@/store/useTodayStore';

// Insights → Experiments (supabase_experiments_migration.sql). Same
// never-throw contract as the other table hooks: mutations return
// { error: string | null } and callers toast it.

export function useExperiments() {
  const { user } = useSession();
  const today = useToday();

  const experimentsQuery = useQuery({
    queryKey: ['experiments', user?.id],
    queryFn: async (): Promise<Experiment[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('user_id', user.id)
        .order('started_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const daysQuery = useQuery({
    queryKey: ['experimentDays', user?.id],
    queryFn: async (): Promise<ExperimentDay[]> => {
      if (!user) return [];
      const { data, error } = await supabase.from('experiment_days').select('*').eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []) as ExperimentDay[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const experiments = experimentsQuery.data ?? [];
  const days = daysQuery.data ?? [];
  return {
    experiments,
    // The one 'active' row, whether still running or past its last day.
    current: experiments.find((e) => e.status === 'active') ?? null,
    running: experiments.find((e) => isRunning(e, today)) ?? null,
    past: experiments.filter((e) => e.status === 'stopped' || isFinished(e, today)),
    daysFor: (experimentId: string) => days.filter((d) => d.experiment_id === experimentId),
    isLoading: experimentsQuery.isLoading || daysQuery.isLoading,
  };
}

// Experiments plus what's needed to show them: each one's result and dot bar,
// over the same 365-day caches History uses.
export function useExperimentResults() {
  const data = useExperiments();
  const { checkins } = useCheckinHistory(365);
  const { flareUps } = useFlareUps(365);
  const today = useToday();
  return {
    ...data,
    today,
    resultFor: (experiment: Experiment): ExperimentResult =>
      experimentResult(experiment, data.daysFor(experiment.id), checkins, flareUps, today),
    statesFor: (experiment: Experiment): DayState[] =>
      experimentDayStates(experiment, data.daysFor(experiment.id), today).map((d) => d.state),
  };
}

function useInvalidateExperiments() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['experiments', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['experimentDays', user?.id] });
  };
}

export interface StartExperimentInput {
  template: string;
  custom_title: string | null;
  length_days: number;
}

export function useStartExperiment() {
  const { user } = useSession();
  const invalidate = useInvalidateExperiments();

  return useMutation({
    mutationFn: async (input: StartExperimentInput): Promise<{ id: string | null; error: string | null }> => {
      if (!user) return { id: null, error: t('common.notSignedIn') };
      const today = todayLocalDate();

      // Only one 'active' row is allowed (a DB index). A finished one is
      // closed as done; a running one is stopped today.
      const { data: active, error: readError } = await supabase
        .from('experiments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (readError) return { id: null, error: readError.message };
      for (const previous of (active ?? []) as Experiment[]) {
        const finished = plannedEnd(previous) < today;
        const { error } = await supabase
          .from('experiments')
          .update(finished ? { status: 'done' } : { status: 'stopped', ended_on: today })
          .eq('id', previous.id);
        if (error) return { id: null, error: error.message };
      }

      const { data, error } = await supabase
        .from('experiments')
        .insert({ ...input, user_id: user.id, started_on: today, status: 'active' })
        .select('id')
        .single();
      return { id: (data as { id: string } | null)?.id ?? null, error: error?.message ?? null };
    },
    onSuccess: invalidate,
  });
}

export function useStopExperiment() {
  const invalidate = useInvalidateExperiments();

  return useMutation({
    mutationFn: async (experimentId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from('experiments')
        .update({ status: 'stopped', ended_on: todayLocalDate() })
        .eq('id', experimentId);
      return { error: error?.message ?? null };
    },
    onSuccess: invalidate,
  });
}

export function useDeleteExperiment() {
  const invalidate = useInvalidateExperiments();

  return useMutation({
    mutationFn: async (experimentId: string): Promise<{ error: string | null }> => {
      // experiment_days go with it (on delete cascade).
      const { error } = await supabase.from('experiments').delete().eq('id', experimentId);
      return { error: error?.message ?? null };
    },
    onSuccess: invalidate,
  });
}

export function useLogExperimentDay() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { experiment_id: string; date: string; followed: boolean }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };
      const { error } = await supabase
        .from('experiment_days')
        .upsert({ ...input, user_id: user.id }, { onConflict: 'experiment_id,date' });
      return { error: error?.message ?? null };
    },
    // Optimistic, so the Yes/No answer shows at once.
    onMutate: (input) => {
      queryClient.setQueryData<ExperimentDay[]>(['experimentDays', user?.id], (old = []) => [
        ...old.filter((d) => !(d.experiment_id === input.experiment_id && d.date === input.date)),
        { id: `pending-${input.date}`, user_id: user?.id ?? '', created_at: '', ...input },
      ]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['experimentDays', user?.id] });
    },
  });
}
