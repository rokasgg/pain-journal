import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { RoutineExercisesEditor } from '@/components/routine/RoutineExercisesEditor';
import { Input } from '@/components/ui/Input';
import { useRoutine, useUpdateRoutine } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { RoutineExercise } from '@/types/database.types';
import { toast } from '@/utils/toast';

// Editing an already-saved routine's own content — title and exercises,
// same editable-card UI as routine/review.tsx (the pre-save draft step),
// via the shared RoutineExercisesEditor. Deliberately doesn't touch
// in_rotation: useUpdateRoutine only updates title/exercises, so editing an
// old, out-of-rotation routine from history doesn't re-add it, and editing
// an in-rotation one doesn't remove it.
export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { routine, isLoading } = useRoutine(id);
  const updateRoutine = useUpdateRoutine();

  // Overrides start `null` and only diverge from the loaded routine once the
  // user actually edits something — avoids seeding state from an async query
  // result via a setState-in-effect (React flags cascading-render effects
  // like that; see routine/complete.tsx's resolvedDraft for the same pattern).
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [exercisesOverride, setExercisesOverride] = useState<RoutineExercise[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (!routine) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray-500 dark:text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  const title = titleOverride ?? routine.title;
  const exercises = exercisesOverride ?? routine.exercises;

  const updateExercise = (exerciseId: string, patch: Partial<RoutineExercise>) => {
    setExercisesOverride(
      exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...patch } : exercise)),
    );
  };

  const removeExercise = (exerciseId: string) => {
    setExercisesOverride(exercises.filter((exercise) => exercise.id !== exerciseId));
  };

  const canSave = title.trim().length > 0 && exercises.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateRoutine.mutateAsync({ id: routine.id, title: title.trim(), exercises });
    setIsSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('routine.updatedToast'));
    router.back();
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Input label={t('routine.reviewTitleLabel')} value={title} onChangeText={setTitleOverride} />

        <RoutineExercisesEditor
          exercises={exercises}
          onUpdateExercise={updateExercise}
          onRemoveExercise={removeExercise}
        />
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
            <Text className="font-semibold text-white">{t('routine.saveChanges')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
