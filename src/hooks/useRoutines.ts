import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Routine, RoutineExercise } from '@/types/database.types';

// A user has at most one is_active routine at a time (enforced by a DB
// trigger — see supabase_routines_migration.sql), so this is a maybeSingle,
// not a list query.
export function useActiveRoutine() {
  const { user } = useSession();

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routines', 'active', user?.id],
    queryFn: async (): Promise<Routine | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Routine | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { routine: routine ?? null, isLoading };
}

// Every routine the user has ever generated, not just the active one —
// old routines are never deleted (is_active just flips to false when a new
// one is created), so this is real, browsable history. See routine/history.tsx.
export function useRoutineHistory() {
  const { user } = useSession();

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines', 'history', user?.id],
    queryFn: async (): Promise<Routine[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Routine[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { routines: routines ?? [], isLoading };
}

export function useRoutine(id: string | undefined) {
  const { user } = useSession();

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routines', 'byId', id],
    queryFn: async (): Promise<Routine | null> => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Routine | null;
    },
    enabled: !!user && !!id,
    staleTime: 60_000,
  });

  return { routine: routine ?? null, isLoading };
}

// The only place a `routines` row is actually created — called from
// routine/review.tsx once the user has reviewed/edited the AI-generated
// draft from useGenerateRoutine(). is_active: true triggers
// deactivate_other_routines() (see supabase_routines_migration.sql), so the
// previous active routine is preserved (not deleted) as history, just
// flipped to is_active: false.
export function useCreateRoutine() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      exercises: RoutineExercise[];
      physio_visit_id: string | null;
    }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase.from('routines').insert({
        user_id: user.id,
        title: input.title,
        exercises: input.exercises,
        physio_visit_id: input.physio_visit_id,
        is_active: true,
      });

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}
