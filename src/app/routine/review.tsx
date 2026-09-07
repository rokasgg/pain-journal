import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useCreateRoutine } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { usePendingRoutineDraftStore } from '@/store/usePendingRoutineDraftStore';
import type { RoutineExercise } from '@/types/database.types';
import { toast } from '@/utils/toast';

// The one editable confirmation step between generating a routine
// (routine/new.tsx) and it actually being saved — AI-generated rep counts/
// descriptions sometimes need correcting, and nothing should be written to
// `routines` until the user has had a chance to fix that. The draft lives in
// usePendingRoutineDraftStore (set by routine/new.tsx right after a
// successful generate), not in this screen's own route params.
export default function ReviewRoutineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = usePendingRoutineDraftStore((s) => s.draft);
  const clearDraft = usePendingRoutineDraftStore((s) => s.clearDraft);
  const createRoutine = useCreateRoutine();

  const [title, setTitle] = useState(draft?.title ?? '');
  const [exercises, setExercises] = useState<RoutineExercise[]>(draft?.exercises ?? []);
  const [isSaving, setIsSaving] = useState(false);

  if (!draft) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray-500 dark:text-gray">{t('routine.noDraftToReview')}</Text>
      </View>
    );
  }

  const updateExercise = (id: string, patch: Partial<RoutineExercise>) => {
    setExercises((prev) => prev.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)));
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  };

  const canSave = title.trim().length > 0 && exercises.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await createRoutine.mutateAsync({
      title: title.trim(),
      exercises,
      physio_visit_id: draft.physioVisitId,
    });
    setIsSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    clearDraft();
    toast.success(t('routine.generatedToast'));
    router.replace('/routine/view');
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.reviewDescription')}</Text>

        <Input label={t('routine.reviewTitleLabel')} value={title} onChangeText={setTitle} />

        {exercises.map((exercise) => (
          <View
            key={exercise.id}
            className="gap-3 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
                {t('routine.exercise')}
              </Text>
              <Pressable
                onPress={() => removeExercise(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={t('routine.removeExercise', { name: exercise.name })}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.gray} />
              </Pressable>
            </View>

            <Input
              label={t('routine.exerciseNameLabel')}
              value={exercise.name}
              onChangeText={(text) => updateExercise(exercise.id, { name: text })}
            />
            <Input
              label={t('routine.muscleGroupLabel')}
              value={exercise.muscle_group}
              onChangeText={(text) => updateExercise(exercise.id, { muscle_group: text })}
            />
            <Input
              label={t('routine.targetSetsRepsLabel')}
              value={exercise.target_sets_reps}
              onChangeText={(text) => updateExercise(exercise.id, { target_sets_reps: text })}
            />
            <Input
              label={t('routine.instructionsLabel')}
              multiline
              numberOfLines={2}
              value={exercise.instructions}
              onChangeText={(text) => updateExercise(exercise.id, { instructions: text })}
            />
            <Input
              label={t('routine.cautionNotesLabel')}
              multiline
              numberOfLines={2}
              value={exercise.caution_notes}
              onChangeText={(text) => updateExercise(exercise.id, { caution_notes: text })}
            />
          </View>
        ))}

        {exercises.length === 0 && (
          <Text className="text-center text-sm text-gray-500 dark:text-gray">{t('routine.noExercisesLeft')}</Text>
        )}
      </ScrollView>

      <View className="px-6 pb-12">
        <Pressable
          onPress={handleSave}
          disabled={!canSave || isSaving}
          className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('routine.saveRoutine')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
