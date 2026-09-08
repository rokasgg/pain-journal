import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ExerciseLogChecklist } from '@/components/checkin/ExerciseLogChecklist';
import { YesNoField } from '@/components/checkin/YesNoField';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useAppendExerciseLogNote, useCreateExerciseLog, useTodayExerciseLogForAny } from '@/hooks/useExerciseLogs';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { formatTime } from '@/lib/dates';
import {
  buildCompletedExercises,
  computeExerciseLogStatus,
  initExerciseLogDraft,
  type ExerciseLogDraft,
} from '@/lib/exerciseLog';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export interface RoutineTrainingStepProps {
  onDone: () => void;
}

// Dedicated evening check-in step — shown only when the user has at least
// one routine in rotation (see CheckinForm's `hasRoutinesInRotation` prop,
// checked by the caller via useRoutinesInRotation() before ever rendering
// this). Same self-contained save logic that used to live inline as
// ExerciseRoutineCheckinCard (now deleted), promoted to its own step so the
// "did you train today?" question doesn't compete for space with the pain
// question on step 1.
//
// A user is assumed to log at most one routine per day (e.g. alternating
// Day A / Day B on different days, not both same-day) — so "already logged
// today" is still a single yes/no gate across every in-rotation routine
// (useTodayExerciseLogForAny), not tracked per routine. When nothing's
// logged yet and more than one routine is in rotation, a small picker asks
// which one this log is for before the usual yes/no + checklist.
//
// No separate inline "Save" button — a standalone save only makes sense when
// logging a routine on its own (routine/complete/[id].tsx, which has nothing
// to continue into). Here, the wizard's own "Continue" button both commits
// whatever was entered on this step (if anything) and advances, so there's
// only ever one action to take. Answering nothing (or "no") and tapping
// Continue just advances with no exercise_logs write — same skip-allowed
// spirit as FlareUpFollowUpStep.
export function RoutineTrainingStep({ onDone }: RoutineTrainingStepProps) {
  const { t } = useTranslation();
  const { routines } = useRoutinesInRotation();
  const routineIds = routines.map((r) => r.id);
  const { log } = useTodayExerciseLogForAny(routineIds);
  const createExerciseLog = useCreateExerciseLog();
  const appendNote = useAppendExerciseLogNote();

  const [hasExtra, setHasExtra] = useState<boolean | null>(null);
  const [extraNote, setExtraNote] = useState('');

  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const routine = routines.length === 1 ? routines[0] : routines.find((r) => r.id === selectedRoutineId) ?? null;

  const [didExercisesToday, setDidExercisesToday] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<ExerciseLogDraft>({});
  const [generalNote, setGeneralNote] = useState('');

  const [isContinuing, setIsContinuing] = useState(false);

  const resolvedDraft = routine && Object.keys(draft).length > 0 ? draft : initExerciseLogDraft(routine?.exercises ?? []);

  const handleSelectRoutine = (id: string) => {
    setSelectedRoutineId(id);
    // Reset any draft state from a previously selected routine — the two
    // routines' exercises don't line up, so a stale draft would misattribute
    // completion/pain entries to the wrong exercise ids.
    setDraft({});
    setDidExercisesToday(null);
  };

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
          // Already logged today (via routine/complete/[id].tsx or this same
          // step earlier) — offer to append a short follow-up note instead of
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
        ) : !routine ? (
          // Nothing logged yet and more than one routine is in rotation —
          // ask which one this is for before anything else.
          <View className="gap-2">
            <Text className="text-lg font-semibold text-black dark:text-white">
              {t('routine.whichRoutineToday')}
            </Text>
            {routines.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleSelectRoutine(option.id)}
                className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-surface px-4 py-3 dark:border-gray-800 dark:bg-surfaceDark"
              >
                <Text className="text-base text-black dark:text-white">{option.title}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray">
                  {t('routine.exerciseCount', { count: option.exercises.length })}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <YesNoField
              label={t('routine.notLoggedQuestion')}
              value={didExercisesToday}
              onChange={setDidExercisesToday}
            />

            {didExercisesToday && (
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
