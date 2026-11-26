import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import { cleanExerciseName, findExerciseByName } from '@/lib/trainingLog';
import type { Exercise, ExerciseDetails } from '@/types/database.types';

// The exercise library ("My exercises", supabase_exercise_library_migration.sql).
// One row per exercise; names are unique per user (case-insensitive), so
// typing an existing name re-uses that exercise instead of duplicating it.
// Never-throw contract like the other table hooks: mutations return { error }.

const EXERCISES_KEY = 'exercises';

async function fetchAllExercises(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

/** Every exercise, including archived ones (for the name check and history). */
export function useAllExercises() {
  const { user } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: [EXERCISES_KEY, user?.id],
    queryFn: () => (user ? fetchAllExercises(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 60_000,
  });

  return { exercises: data ?? [], isLoading };
}

/** The library as shown when logging: not archived, by name. */
export function useExercises() {
  const { exercises, isLoading } = useAllExercises();
  return { exercises: exercises.filter((exercise) => !exercise.archived), isLoading };
}

export function useExercise(id: string | undefined) {
  const { exercises, isLoading } = useAllExercises();
  return { exercise: exercises.find((exercise) => exercise.id === id) ?? null, isLoading };
}

type DetailsInput = Partial<Omit<ExerciseDetails, 'name'>>;

function cleanDetails(details: DetailsInput): DetailsInput {
  const out: DetailsInput = {};
  for (const key of ['muscle_group', 'target_sets_reps', 'instructions', 'caution_notes'] as const) {
    if (key in details) out[key] = details[key]?.trim() || null;
  }
  return out;
}

/**
 * Adds exercises by name, re-using (and un-archiving) any that already exist.
 * Returns their ids in the input order. Existing exercises keep their own
 * details, except empty fields, which are filled from the input.
 */
async function upsertByName(
  userId: string,
  inputs: (DetailsInput & { name: string })[],
): Promise<{ ids: string[]; error: string | null }> {
  let existing: Exercise[];
  try {
    existing = await fetchAllExercises(userId);
  } catch (e) {
    return { ids: [], error: e instanceof Error ? e.message : String(e) };
  }

  const ids: string[] = [];
  for (const input of inputs) {
    const name = cleanExerciseName(input.name);
    if (!name) continue;
    const details = cleanDetails(input);
    const match = findExerciseByName(existing, name);

    if (match) {
      const fill: DetailsInput & { archived?: boolean } = {};
      for (const [key, value] of Object.entries(details) as [keyof DetailsInput, string | null][]) {
        if (value && !match[key]) fill[key] = value;
      }
      if (match.archived) fill.archived = false;
      if (Object.keys(fill).length > 0) {
        const { error } = await supabase.from('exercises').update(fill).eq('id', match.id).eq('user_id', userId);
        if (error) return { ids, error: error.message };
      }
      ids.push(match.id);
      continue;
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert({ user_id: userId, name, ...details })
      .select('*')
      .single();
    if (error) return { ids, error: error.message };
    const created = data as Exercise;
    existing = [...existing, created];
    ids.push(created.id);
  }
  return { ids, error: null };
}

/** Typing a name while logging: creates it, or returns the existing one. */
export function useCreateExercise() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DetailsInput & { name: string }): Promise<{ id: string | null; error: string | null }> => {
      if (!user) return { id: null, error: t('common.notSignedIn') };
      const { ids, error } = await upsertByName(user.id, [input]);
      return { id: ids[0] ?? null, error };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EXERCISES_KEY] }),
  });
}

/** AI / photo import: adds many at once, de-duplicated by name. */
export function useImportExercises() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: (DetailsInput & { name: string })[]): Promise<{ ids: string[]; error: string | null }> => {
      if (!user) return { ids: [], error: t('common.notSignedIn') };
      return upsertByName(user.id, inputs);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EXERCISES_KEY] }),
  });
}

export function useUpdateExercise() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExerciseDetails & { id: string }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };
      const name = cleanExerciseName(input.name);
      if (!name) return { error: t('training.nameRequired') };

      const { error } = await supabase
        .from('exercises')
        .update({ name, ...cleanDetails(input) })
        .eq('id', input.id)
        .eq('user_id', user.id);

      // 23505 = unique violation: another exercise already has this name.
      if (error?.code === '23505') return { error: t('training.nameTaken') };
      return { error: error?.message ?? null };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EXERCISES_KEY] }),
  });
}

/**
 * Archiving hides an exercise from logging but keeps it for history (logs
 * keep its name snapshot either way). Reversible by typing the name again.
 */
export function useArchiveExercise() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };
      const { error } = await supabase
        .from('exercises')
        .update({ archived: input.archived })
        .eq('id', input.id)
        .eq('user_id', user.id);
      return { error: error?.message ?? null };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [EXERCISES_KEY] }),
  });
}
