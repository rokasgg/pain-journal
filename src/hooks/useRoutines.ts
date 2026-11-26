import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Routine } from '@/types/database.types';

// Routines are presets now (supabase_exercise_library_migration.sql): a title
// plus the library exercises it pre-ticks when logging (`exercise_ids`). The
// exercises themselves live in `exercises` (useExercises.ts). `in_rotation`
// means "show this preset as a chip when logging"; turning it off hides an
// old program without deleting it. Deleting a preset keeps its logs
// (exercise_logs.routine_id is `on delete set null`).

/** Every preset, oldest first (so "Day A" stays before "Day B"). */
export function usePresets() {
  const { user } = useSession();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['routines', 'all', user?.id],
    queryFn: async (): Promise<Routine[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Routine[]).map((routine) => ({ ...routine, exercise_ids: routine.exercise_ids ?? [] }));
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { presets: presets ?? [], isLoading };
}

/** The presets shown as chips when logging a workout. */
export function useShownPresets() {
  const { presets, isLoading } = usePresets();
  return { presets: presets.filter((preset) => preset.in_rotation), isLoading };
}

export function usePreset(id: string | undefined) {
  const { presets, isLoading } = usePresets();
  return { preset: presets.find((preset) => preset.id === id) ?? null, isLoading };
}

export interface PresetInput {
  title: string;
  exercise_ids: string[];
}

export function useCreatePreset() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: PresetInput & { physio_visit_id?: string | null },
    ): Promise<{ error: string | null; id: string | null }> => {
      if (!user) return { error: t('common.notSignedIn'), id: null };

      const { data, error } = await supabase
        .from('routines')
        .insert({
          user_id: user.id,
          title: input.title,
          exercise_ids: input.exercise_ids,
          physio_visit_id: input.physio_visit_id ?? null,
          in_rotation: true,
        })
        .select('id')
        .single();

      return { error: error?.message ?? null, id: (data?.id as string | undefined) ?? null };
    },
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

export function useUpdatePreset() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PresetInput & { id: string }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('routines')
        .update({ title: input.title, exercise_ids: input.exercise_ids })
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

/** Show or hide a preset's chip when logging. Reversible, so no confirm. */
export function useSetPresetShown() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; shown: boolean }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('routines')
        .update({ in_rotation: input.shown })
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

export function useDeletePreset() {
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
      // Logs keep existing but lose their routine_id.
      queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
    },
  });
}
