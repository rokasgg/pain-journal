import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { HeaderSaveButton } from '@/components/training/HeaderSaveButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { useArchiveExercise, useCreateExercise, useExercise, useUpdateExercise } from '@/hooks/useExercises';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import type { ExerciseDetails } from '@/types/database.types';
import { toast } from '@/utils/toast';

const EMPTY: ExerciseDetails = {
  name: '',
  muscle_group: null,
  target_sets_reps: null,
  instructions: null,
  caution_notes: null,
};

// Add (`id` = "new") or edit one exercise in the library. Only the name is
// required. Archiving hides it from logging; its logged history keeps its
// name either way.
export default function ExerciseEditScreen() {
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { t } = useTranslation();
  const { exercise, isLoading } = useExercise(isNew ? undefined : id);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const archiveExercise = useArchiveExercise();

  // Edits diverge from the loaded row only once typed (no setState-in-effect).
  const [override, setOverride] = useState<Partial<ExerciseDetails>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (!isNew && isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isNew && !exercise) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  const base: ExerciseDetails = exercise ?? EMPTY;
  const values: ExerciseDetails = { ...base, ...override };
  const set = (patch: Partial<ExerciseDetails>) => setOverride((prev) => ({ ...prev, ...patch }));
  const isDirty = Object.keys(override).length > 0;
  const canSave = values.name.trim().length > 0 && (isNew || isDirty);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = isNew
      ? await createExercise.mutateAsync(values)
      : await updateExercise.mutateAsync({ ...values, id: exercise!.id });
    setIsSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('training.exerciseSaved'));
    router.back();
  };

  const handleArchive = async () => {
    if (!exercise) return;
    const { error } = await archiveExercise.mutateAsync({ id: exercise.id, archived: true });
    setConfirmArchive(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('training.archivedToast'));
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t(isNew ? 'training.newExercise' : 'training.editExercise'),
          ...headerRightWithoutGlass(<HeaderSaveButton onPress={handleSave} enabled={canSave} isSaving={isSaving} />),
        }}
      />
      <ScrollView
        {...keepFocusedVisible}
        className="flex-1 bg-background dark:bg-backgroundDark"
        contentContainerClassName="gap-5 px-5 pb-12 pt-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Input
          label={t('routine.exerciseNameLabel')}
          placeholder={t('training.namePlaceholder')}
          value={values.name}
          onChangeText={(name) => set({ name })}
          autoFocus={isNew}
          maxLength={80}
        />
        <Input
          label={`${t('routine.targetSetsRepsLabel')} · ${t('training.optional')}`}
          placeholder={t('training.setsRepsPlaceholder')}
          value={values.target_sets_reps ?? ''}
          onChangeText={(target_sets_reps) => set({ target_sets_reps })}
        />
        <Input
          label={`${t('routine.muscleGroupLabel')} · ${t('training.optional')}`}
          value={values.muscle_group ?? ''}
          onChangeText={(muscle_group) => set({ muscle_group })}
        />
        <Input
          label={`${t('routine.instructionsLabel')} · ${t('training.optional')}`}
          multiline
          numberOfLines={3}
          value={values.instructions ?? ''}
          onChangeText={(instructions) => set({ instructions })}
        />
        <Input
          label={`${t('routine.cautionNotesLabel')} · ${t('training.optional')}`}
          multiline
          numberOfLines={2}
          value={values.caution_notes ?? ''}
          onChangeText={(caution_notes) => set({ caution_notes })}
        />

        {!isNew && (
          <Pressable onPress={() => setConfirmArchive(true)} className="items-center py-3">
            <Text className="text-body font-semibold text-red-600 dark:text-red-500">{t('training.archive')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmArchive}
        variant="destructive"
        title={t('training.archiveConfirmTitle')}
        message={t('training.archiveConfirmMessage')}
        confirmLabel={t('training.archive')}
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
        isLoading={archiveExercise.isPending}
      />
    </>
  );
}
