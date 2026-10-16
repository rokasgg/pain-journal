import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { StepProgressBar } from '@/components/checkin/StepProgressBar';
import { ExerciseReviewStep } from '@/components/routine/ExerciseReviewStep';
import { RoutineExerciseList } from '@/components/routine/RoutineExerciseList';
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { useCreateRoutine } from '@/hooks/useRoutines';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { usePendingRoutineDraftStore } from '@/store/usePendingRoutineDraftStore';
import type { RoutineExercise } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

// The one editable confirmation step between generating a routine
// (routine/new.tsx) and it actually being saved — AI-generated rep counts/
// descriptions sometimes need correcting, and nothing should be written to
// `routines` until the user has had a chance to fix that. The draft lives in
// usePendingRoutineDraftStore (set by routine/new.tsx right after a
// successful generate), not in this screen's own route params.
//
// A wizard, not one long scroll: reviewing 6-9 exercises as stacked editable
// cards in a single ScrollView read as cluttered, so this steps through
// title -> one exercise per screen -> a final read-only summary (where the
// actual Save lives). Editing after the first pass happens via long-press ->
// Edit/Delete on the summary, same pattern as routine/view.tsx's list.
// step 1 = title, steps 2..exercises.length+1 = one exercise each,
// step exercises.length+2 = summary.
export default function ReviewRoutineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = usePendingRoutineDraftStore((s) => s.draft);
  const clearDraft = usePendingRoutineDraftStore((s) => s.clearDraft);
  const createRoutine = useCreateRoutine();

  const [title, setTitle] = useState(draft?.title ?? '');
  const [exercises, setExercises] = useState<RoutineExercise[]>(draft?.exercises ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  useStepHaptic(currentStep);
  // Set when "Edit" is tapped on a summary card — while true, the exercise
  // step's button reads "Done" and returns straight to the summary instead
  // of advancing to the next exercise.
  const [returnToSummaryAfterEdit, setReturnToSummaryAfterEdit] = useState(false);

  const [actionSheetExerciseId, setActionSheetExerciseId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalSteps = exercises.length + 2;
  const summaryStep = exercises.length + 1 + 1;

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
    // The exercise being deleted might have been the very last one, which
    // would otherwise leave currentStep pointing past the new (shorter)
    // exercises.length+2 summary step.
    setCurrentStep((prev) => Math.min(prev, exercises.length - 1 + 2));
  };

  const canSave = title.trim().length > 0 && exercises.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    const { error, id } = await createRoutine.mutateAsync({
      title: title.trim(),
      exercises,
      physio_visit_id: draft.physioVisitId,
    });
    setIsSaving(false);

    if (error || !id) {
      toast.error(error ?? t('routine.generateFailed'));
      return;
    }

    clearDraft();
    toast.success(t('routine.generatedToast'));
    router.replace(`/routine/${id}` as Href);
  };

  const handleLongPressExercise = (exercise: RoutineExercise) => {
    haptics.press();
    setActionSheetExerciseId(exercise.id);
  };

  const handleEditExercise = () => {
    if (!actionSheetExerciseId) return;
    const index = exercises.findIndex((e) => e.id === actionSheetExerciseId);
    setActionSheetExerciseId(null);
    if (index === -1) return;

    setReturnToSummaryAfterEdit(true);
    setCurrentStep(index + 2);
  };

  const handleRequestDeleteExercise = () => {
    if (!actionSheetExerciseId) return;
    setConfirmDeleteId(actionSheetExerciseId);
    setActionSheetExerciseId(null);
  };

  const handleConfirmDeleteExercise = () => {
    if (!confirmDeleteId) return;
    removeExercise(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const exerciseActions: ActionSheetAction[] = [
    { label: t('common.edit'), onPress: handleEditExercise },
    { label: t('common.delete'), onPress: handleRequestDeleteExercise, destructive: true },
  ];

  const handleExerciseContinue = () => {
    if (returnToSummaryAfterEdit) {
      setReturnToSummaryAfterEdit(false);
      setCurrentStep(summaryStep);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <View className="px-6 pt-2">
        <StepProgressBar step={currentStep} totalSteps={totalSteps} />
      </View>

      {currentStep === 1 && (
        <View className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
            <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.reviewDescription')}</Text>
            <Input label={t('routine.reviewTitleLabel')} value={title} onChangeText={setTitle} />
          </ScrollView>

          <View className="px-6 pb-12">
            <Pressable
              onPress={() => setCurrentStep(2)}
              disabled={title.trim().length === 0}
              className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
            >
              <Text className="font-semibold text-white">{t('common.next')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {currentStep > 1 &&
        currentStep < summaryStep &&
        (() => {
          const index = currentStep - 2;
          const exercise = exercises[index];
          if (!exercise) return null;
          return (
            <ExerciseReviewStep
              exercise={exercise}
              index={index + 1}
              total={exercises.length}
              onChange={(patch) => updateExercise(exercise.id, patch)}
              onBack={() => setCurrentStep((prev) => prev - 1)}
              onContinue={handleExerciseContinue}
              continueLabel={returnToSummaryAfterEdit ? t('common.done') : t('common.next')}
            />
          );
        })()}

      {currentStep === summaryStep && (
        <View className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 py-6">
            <Text className="text-xl font-bold text-black dark:text-white">{title}</Text>

            {exercises.length === 0 ? (
              <Text className="text-center text-sm text-gray-500 dark:text-gray">{t('routine.noExercisesLeft')}</Text>
            ) : (
              <RoutineExerciseList exercises={exercises} onLongPressExercise={handleLongPressExercise} />
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
      )}

      <ActionSheet
        visible={actionSheetExerciseId !== null}
        actions={exerciseActions}
        onCancel={() => setActionSheetExerciseId(null)}
      />

      <ConfirmModal
        visible={confirmDeleteId !== null}
        title={t('routine.deleteExerciseConfirmTitle')}
        message={t('routine.deleteExerciseConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDeleteExercise}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </View>
  );
}
