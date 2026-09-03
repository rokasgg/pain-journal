import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ExerciseLogChecklist } from '@/components/checkin/ExerciseLogChecklist';
import { YesNoField } from '@/components/checkin/YesNoField';
import { Input } from '@/components/ui/Input';
import { useAppendExerciseLogNote, useCreateExerciseLog, useTodayExerciseLog } from '@/hooks/useExerciseLogs';
import { useActiveRoutine } from '@/hooks/useRoutines';
import { buildCompletedExercises, computeExerciseLogStatus, initExerciseLogDraft } from '@/lib/exerciseLog';
import { formatTime } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

// Rendered above the evening check-in's own fields (via CheckinForm's
// `header` prop, evening only — see checkin/[type].tsx). Self-contained:
// owns its own save actions, entirely decoupled from the check-in form's
// own submit lifecycle, since "did today's rehab exercises happen" is a
// separate concern from the check-in itself.
export function ExerciseRoutineCheckinCard() {
  const { t } = useTranslation();
  const { routine } = useActiveRoutine();
  const { log } = useTodayExerciseLog(routine?.id);
  const createExerciseLog = useCreateExerciseLog();
  const appendNote = useAppendExerciseLogNote();

  const [hasExtra, setHasExtra] = useState<boolean | null>(null);
  const [extraNote, setExtraNote] = useState('');
  const [isSavingExtra, setIsSavingExtra] = useState(false);

  const [didExercisesToday, setDidExercisesToday] = useState<boolean | null>(null);
  const [draft, setDraft] = useState(() => initExerciseLogDraft(routine?.exercises ?? []));
  const [generalNote, setGeneralNote] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  if (!routine) return null;

  // Already logged today (via routine/complete.tsx or this same card
  // earlier) — offer to append a short follow-up note instead of creating a
  // second exercise_logs row for the day.
  if (log) {
    const handleSaveExtraNote = async () => {
      const combinedNote = [log.general_note, extraNote.trim()].filter(Boolean).join('\n');
      setIsSavingExtra(true);
      const { error } = await appendNote.mutateAsync({ id: log.id, general_note: combinedNote });
      setIsSavingExtra(false);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(t('routine.extraNoteSavedToast'));
      setExtraNote('');
      setHasExtra(null);
    };

    return (
      <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-base font-semibold text-black dark:text-white">
          {t('routine.alreadyLoggedTitle', { time: formatTime(log.logged_at) })}
        </Text>

        <YesNoField label={t('routine.alreadyLoggedQuestion')} value={hasExtra} onChange={setHasExtra} />

        {hasExtra && (
          <>
            <Input
              placeholder={t('routine.addExtraNotePlaceholder')}
              value={extraNote}
              onChangeText={setExtraNote}
              multiline
              numberOfLines={2}
            />
            <Pressable
              onPress={handleSaveExtraNote}
              disabled={isSavingExtra || !extraNote.trim()}
              className="items-center rounded-lg bg-primary py-2.5 disabled:opacity-50 dark:bg-primaryDark"
            >
              {isSavingExtra ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="font-semibold text-white">{t('routine.addExtraNoteButton')}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // Not logged yet today — condensed version of the same checklist used by
  // routine/complete.tsx, saved right here rather than via a full screen.
  const resolvedDraft = Object.keys(draft).length > 0 ? draft : initExerciseLogDraft(routine.exercises);

  const handleSaveLog = async () => {
    const completedExercises = buildCompletedExercises(routine.exercises, resolvedDraft);
    const status = computeExerciseLogStatus(completedExercises);

    setIsSavingLog(true);
    const { error } = await createExerciseLog.mutateAsync({
      routine_id: routine.id,
      status,
      completed_exercises: completedExercises,
      general_note: generalNote.trim() || null,
    });
    setIsSavingLog(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('routine.logSavedToast'));
  };

  return (
    <View className="gap-4 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <YesNoField label={t('routine.notLoggedQuestion')} value={didExercisesToday} onChange={setDidExercisesToday} />

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

          <Pressable
            onPress={handleSaveLog}
            disabled={isSavingLog}
            className="items-center rounded-lg bg-primary py-2.5 disabled:opacity-50 dark:bg-primaryDark"
          >
            {isSavingLog ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-semibold text-white">{t('routine.saveLog')}</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}
