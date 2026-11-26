import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { StepProgressBar } from '@/components/checkin/StepProgressBar';
import { ExerciseReviewStep } from '@/components/routine/ExerciseReviewStep';
import { RoutineExerciseList } from '@/components/routine/RoutineExerciseList';
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { useImportExercises } from '@/hooks/useExercises';
import { useCreatePreset } from '@/hooks/useRoutines';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { usePendingRoutineDraftStore } from '@/store/usePendingRoutineDraftStore';
import type { RoutineExercise } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';
import { PremiumScreen } from '@/components/premium/PremiumScreen';

// The one editable confirmation step between an AI import (routine/new.tsx)
// and anything being saved — AI-generated rep counts/descriptions sometimes
// need correcting. Saving adds the exercises to "My exercises" (de-duplicated
// by name; existing ones keep their details) and, by default, a preset that
// pre-ticks them, named from the AI title. The draft lives in
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
function ReviewRoutineScreenContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = usePendingRoutineDraftStore((s) => s.draft);
  const clearDraft = usePendingRoutineDraftStore((s) => s.clearDraft);
  const importExercises = useImportExercises();
  const createPreset = useCreatePreset();

  const [title, setTitle] = useState(draft?.title ?? '');
  const [exercises, setExercises] = useState<RoutineExercise[]>(draft?.exercises ?? []);
  const [saveAsPreset, setSaveAsPreset] = useState(true);
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

  const canSave = exercises.length > 0 && (!saveAsPreset || title.trim().length > 0);

  const handleSave = async () => {
    setIsSaving(true);
    const imported = await importExercises.mutateAsync(exercises);
    if (imported.error) {
      setIsSaving(false);
      toast.error(imported.error);
      return;
    }
    if (saveAsPreset && imported.ids.length > 0) {
      const preset = await createPreset.mutateAsync({
        title: title.trim(),
        exercise_ids: [...new Set(imported.ids)],
        physio_visit_id: draft.physioVisitId,
      });
      if (preset.error) {
        setIsSaving(false);
        toast.error(preset.error);
        return;
      }
    }
    setIsSaving(false);

    clearDraft();
    toast.success(t('training.importedToast'));
    router.replace('/training/exercises' as Href);
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
            <View className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3 dark:bg-surfaceDark">
              <View className="flex-1 pr-3">
                <Text className="text-body text-black dark:text-white">{t('training.saveAsPreset')}</Text>
                <Text className="text-caption text-gray">{t('training.saveAsPresetHint')}</Text>
              </View>
              <Switch value={saveAsPreset} onValueChange={setSaveAsPreset} trackColor={{ true: colors.accent }} />
            </View>
            {saveAsPreset && (
              <Input label={t('training.presetTitleLabel')} value={title} onChangeText={setTitle} maxLength={40} />
            )}
          </ScrollView>

          <View className="px-6 pb-12">
            <Pressable
              onPress={() => setCurrentStep(2)}
              disabled={saveAsPreset && title.trim().length === 0}
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
            <Text className="text-xl font-bold text-black dark:text-white">
              {saveAsPreset ? title : t('training.importSummaryTitle')}
            </Text>

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
                <Text className="font-semibold text-white">{t('training.addToMyExercises')}</Text>
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
        message={t('training.removeFromImportMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDeleteExercise}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </View>
  );
}

// Premium-only (CLAUDE.md "Premium"): the content's hooks never run for free users.
export default function ReviewRoutineScreen() {
  return (
    <PremiumScreen feature="routines">
      <ReviewRoutineScreenContent />
    </PremiumScreen>
  );
}
