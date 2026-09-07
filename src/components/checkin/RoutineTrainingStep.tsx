import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ExerciseLogChecklist } from '@/components/checkin/ExerciseLogChecklist';
import { YesNoField } from '@/components/checkin/YesNoField';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useAppendExerciseLogNote, useCreateExerciseLog, useTodayExerciseLog } from '@/hooks/useExerciseLogs';
import { useActiveRoutine } from '@/hooks/useRoutines';
import { formatTime } from '@/lib/dates';
import { buildCompletedExercises, computeExerciseLogStatus, initExerciseLogDraft } from '@/lib/exerciseLog';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export interface RoutineTrainingStepProps {
  onDone: () => void;
}

// Dedicated evening check-in step — shown only when the user has an active
// routine (see CheckinForm's `hasActiveRoutine` prop, checked by the caller
// via useActiveRoutine() before ever rendering this). Same self-contained
// save logic that used to live inline as ExerciseRoutineCheckinCard (now
// deleted), promoted to its own step so the "did you train today?" question
// doesn't compete for space with the pain question on step 1.
//
// No separate inline "Save" button — a standalone save only makes sense when
// logging a routine on its own (routine/complete.tsx, which has nothing to
// continue into). Here, the wizard's own "Continue" button both commits
// whatever was entered on this step (if anything) and advances, so there's
// only ever one action to take. Answering nothing (or "no") and tapping
// Continue just advances with no exercise_logs write — same skip-allowed
// spirit as FlareUpFollowUpStep.
export function RoutineTrainingStep({ onDone }: RoutineTrainingStepProps) {
  const { t } = useTranslation();
  const { routine } = useActiveRoutine();
  const { log } = useTodayExerciseLog(routine?.id);
  const createExerciseLog = useCreateExerciseLog();
  const appendNote = useAppendExerciseLogNote();

  const [hasExtra, setHasExtra] = useState<boolean | null>(null);
  const [extraNote, setExtraNote] = useState('');

  const [didExercisesToday, setDidExercisesToday] = useState<boolean | null>(null);
  const [draft, setDraft] = useState(() => initExerciseLogDraft(routine?.exercises ?? []));
  const [generalNote, setGeneralNote] = useState('');

  const [isContinuing, setIsContinuing] = useState(false);

  const resolvedDraft = routine && Object.keys(draft).length > 0 ? draft : initExerciseLogDraft(routine?.exercises ?? []);

  const handleContinue = async () => {
    if (log) {
      // Already logged today — only save if the user opted into an extra
      // note; otherwise there's nothing to commit.
      if (!hasExtra || !extraNote.trim()) {
        onDone();
        return;
      }

      const combinedNote = [log.general_note, extraNote.trim()].filter(Boolean).join('\n');
      setIsContinuing(true);
      const { error } = await appendNote.mutateAsync({ id: log.id, general_note: combinedNote });
      setIsContinuing(false);

      if (error) {
        // Stay on the step — don't silently lose what they typed.
        toast.error(error);
        return;
      }

      toast.success(t('routine.extraNoteSavedToast'));
      onDone();
      return;
    }

    // Not logged yet — only save if they said yes to doing the routine.
    if (!didExercisesToday || !routine) {
      onDone();
      return;
    }

    const completedExercises = buildCompletedExercises(routine.exercises, resolvedDraft);
    const status = computeExerciseLogStatus(completedExercises);

    setIsContinuing(true);
    const { error } = await createExerciseLog.mutateAsync({
      routine_id: routine.id,
      status,
      completed_exercises: completedExercises,
      general_note: generalNote.trim() || null,
    });
    setIsContinuing(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('routine.logSavedToast'));
    onDone();
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 py-6">
        {log ? (
          // Already logged today (via routine/complete.tsx or this same step
          // earlier) — offer to append a short follow-up note instead of
          // creating a second exercise_logs row for the day.
          <View className="gap-3">
            <Text className="text-lg font-semibold text-black dark:text-white">
              {t('routine.alreadyLoggedTitle', { time: formatTime(log.logged_at) })}
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
            <YesNoField
              label={t('routine.notLoggedQuestion')}
              value={didExercisesToday}
              onChange={setDidExercisesToday}
            />

            {didExercisesToday && routine && (
              <>
                <ExerciseLogChecklist exercises={routine.exercises} draft={resolvedDraft} onChange={setDraft} />

                <Input
                  label={t('routine.generalNoteLabel')}
                  placeholder={t('routine.generalNotePlaceholder')}
                  multiline
                  numberOfLines={2}
                  value={generalNote}
                  onChangeText={setGeneralNote}
                />
              </>
            )}
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
