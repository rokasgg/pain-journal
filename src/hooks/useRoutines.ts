import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Routine, RoutineExercise } from '@/types/database.types';

// Any number of routines can be `in_rotation` at once (see
// supabase_routines_migration_v2.sql) — the user manually picks which one to
// train each day, e.g. alternating a physio's Day A / Day B routines. This
// replaced an earlier single-active model (a maybeSingle query + a DB
// trigger that deactivated every other routine on create).
export function useRoutinesInRotation() {
  const { user } = useSession();

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines', 'inRotation', user?.id],
    queryFn: async (): Promise<Routine[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('in_rotation', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Routine[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { routines: routines ?? [], isLoading };
}

// Every routine the user has ever generated, not just the ones currently in
// rotation — old routines are never deleted, so this is real, browsable
// history. See routine/view.tsx.
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
// draft from useGenerateRoutine(). in_rotation: true joins the rotation
// without affecting any other routine — there's no more auto-deactivation.
export function useCreateRoutine() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      exercises: RoutineExercise[];
      physio_visit_id: string | null;
    }): Promise<{ error: string | null; id: string | null }> => {
      if (!user) return { error: t('common.notSignedIn'), id: null };

      const { data, error } = await supabase
        .from('routines')
        .insert({
          user_id: user.id,
          title: input.title,
          exercises: input.exercises,
          physio_visit_id: input.physio_visit_id,
          in_rotation: true,
        })
        .select()
        .single();

      return { error: error?.message ?? null, id: data?.id ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Edits a routine's own content in place — unlike useCreateRoutine, this
// never touches in_rotation, so editing an old, out-of-rotation routine from
// history doesn't re-add it and editing an in-rotation one doesn't remove it.
export function useUpdateRoutine() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      exercises: RoutineExercise[];
    }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('routines')
        .update({ title: input.title, exercises: input.exercises })
        .eq('id', input.id)
        .eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Adds/removes a routine from rotation — the only way rotation membership
// changes now that there's no single-active trigger. Reversible and
// non-destructive, so callers don't need a confirm dialog (unlike delete).
export function useSetRoutineRotation() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; in_rotation: boolean }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('routines')
        .update({ in_rotation: input.in_rotation })
        .eq('id', input.id)
        .eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

export function useDeleteRoutine() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase.from('routines').delete().eq('id', id).eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}
