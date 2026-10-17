import { Pressable, ScrollView, Text, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { RoutineExercise } from '@/types/database.types';

export interface ExerciseReviewStepProps {
  exercise: RoutineExercise;
  index: number;
  total: number;
  onChange: (patch: Partial<RoutineExercise>) => void;
  onBack: () => void;
  onContinue: () => void;
  // "Continue" advances to the next exercise on a normal first pass through
  // the wizard; "Done" (via the edit-from-summary jump) returns straight to
  // the summary step instead — same onContinue handler either way, the
  // caller decides which behavior it means by which label it passes.
  continueLabel: string;
}

// One exercise's editable card, promoted to its own full step — reviewing a
// routine with 6-9 exercises as one long scroll of stacked cards read as
// cluttered, so routine/review.tsx now shows one at a time. Same 5 fields
// RoutineExercisesEditor.tsx renders per card (that component stays as-is,
// still used by routine/edit/[id].tsx's single-scroll form for an
// already-saved routine — a different screen/concern from this one). No
// remove button here by design — removing an exercise only happens via
// long-press → Delete on the final summary list.
export function ExerciseReviewStep({
  exercise,
  index,
  total,
  onChange,
  onBack,
  onContinue,
  continueLabel,
}: ExerciseReviewStepProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
          {t('routine.exerciseStepLabel', { index, total })}
        </Text>

        <Input
          label={t('routine.exerciseNameLabel')}
          value={exercise.name}
          onChangeText={(text) => onChange({ name: text })}
        />
        <Input
          label={t('routine.muscleGroupLabel')}
          value={exercise.muscle_group}
          onChangeText={(text) => onChange({ muscle_group: text })}
        />
        <Input
          label={t('routine.targetSetsRepsLabel')}
          value={exercise.target_sets_reps}
          onChangeText={(text) => onChange({ target_sets_reps: text })}
        />
        <Input
          label={t('routine.instructionsLabel')}
          multiline
          numberOfLines={2}
          value={exercise.instructions}
          onChangeText={(text) => onChange({ instructions: text })}
        />
        <Input
          label={t('routine.cautionNotesLabel')}
          multiline
          numberOfLines={2}
          value={exercise.caution_notes}
          onChangeText={(text) => onChange({ caution_notes: text })}
        />
      </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onBack}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
        </Pressable>
        <Pressable onPress={onContinue} className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark">
          <Text className="font-semibold text-white">{continueLabel}</Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}
