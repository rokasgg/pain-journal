import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { YesNoField } from '@/components/checkin/YesNoField';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import {
  buildTrainingInsert,
  EMPTY_TRAINING_FORM,
  TrainingLogBody,
  type TrainingFormValue,
} from '@/components/training/TrainingLogBody';
import { Input } from '@/components/ui/Input';
import { useExercises } from '@/hooks/useExercises';
import { useAppendExerciseLogNote, useCreateExerciseLog, useTodayTrainingLog } from '@/hooks/useExerciseLogs';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';
import { usePresets } from '@/hooks/useRoutines';
import { formatTime } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { trainingSavedToastKey } from '@/lib/trainingInsights';
import { toast } from '@/utils/toast';

export interface RoutineTrainingStepProps {
  onDone: () => void;
}

// Evening check-in pre-step, shown when training is on (CheckinForm's
// `showTrainingStep`). "Did you do your exercises today?" → Yes reveals the
// same TrainingLogBody as training/log.tsx. Skippable: no answer or "No"
// just continues and saves nothing.
//
// One workout a day is assumed: if one is already logged today, this offers
// to append a note to it instead of creating a second row.
//
// No separate Save button: "Next" both commits what was entered and
// advances, and stays on the step if the save fails.
export function RoutineTrainingStep({ onDone }: RoutineTrainingStepProps) {
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const { t } = useTranslation();
  const { log } = useTodayTrainingLog();
  const { exercises } = useExercises();
  const { presets } = usePresets();
  const createExerciseLog = useCreateExerciseLog();
  const appendNote = useAppendExerciseLogNote();

  const [hasExtra, setHasExtra] = useState<boolean | null>(null);
  const [extraNote, setExtraNote] = useState('');
  const [didTrain, setDidTrain] = useState<boolean | null>(null);
  const [form, setForm] = useState<TrainingFormValue>(EMPTY_TRAINING_FORM);
  const [isContinuing, setIsContinuing] = useState(false);

  const handleContinue = async () => {
    if (log) {
      if (!hasExtra || !extraNote.trim()) {
        onDone();
        return;
      }
      const combinedNote = [log.general_note, extraNote.trim()].filter(Boolean).join('\n');
      setIsContinuing(true);
      const { error } = await appendNote.mutateAsync({ id: log.id, general_note: combinedNote });
      setIsContinuing(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(t('routine.extraNoteSavedToast'));
      onDone();
      return;
    }

    const insert = didTrain ? buildTrainingInsert(form, exercises, presets) : null;
    if (!insert) {
      onDone();
      return;
    }

    setIsContinuing(true);
    const { error } = await createExerciseLog.mutateAsync(insert);
    setIsContinuing(false);
    if (error) {
      // Stay on the step — don't silently lose what they ticked.
      toast.error(error);
      return;
    }
    toast.success(
      t(trainingSavedToastKey(form.painBefore, form.painAfter), {
        before: form.painBefore ?? '',
        after: form.painAfter ?? '',
      }),
    );
    onDone();
  };

  return (
    <View className="flex-1">
      <ScrollView
        {...keepFocusedVisible}
        className="flex-1"
        contentContainerClassName="gap-5 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        {log ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-black dark:text-white">
              {t('training.loggedToday', { time: formatTime(log.logged_at) })}
            </Text>
            <YesNoField label={t('routine.alreadyLoggedQuestion')} value={hasExtra} onChange={setHasExtra} />
            {hasExtra && (
              <Input
                placeholder={t('routine.addExtraNotePlaceholder')}
                value={extraNote}
                onChangeText={setExtraNote}
                multiline
                numberOfLines={2}
              />
            )}
          </View>
        ) : (
          <>
            <YesNoField label={t('training.didTrainToday')} value={didTrain} onChange={setDidTrain} />
            {didTrain && <TrainingLogBody value={form} onChange={setForm} />}
          </>
        )}
      </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={handleContinue}
          disabled={isContinuing}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isContinuing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('common.next')}</Text>
          )}
        </Pressable>
      </WizardFooter>
    </View>
  );
}
