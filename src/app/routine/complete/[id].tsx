import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ExerciseLogChecklist } from '@/components/checkin/ExerciseLogChecklist';
import { PainSlider } from '@/components/checkin/PainSlider';
import { Input } from '@/components/ui/Input';
import { useCreateExerciseLog } from '@/hooks/useExerciseLogs';
import { useRoutine } from '@/hooks/useRoutines';
import { buildCompletedExercises, computeExerciseLogStatus, initExerciseLogDraft } from '@/lib/exerciseLog';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { trainingSavedToastKey } from '@/lib/trainingInsights';
import { toast } from '@/utils/toast';

// Trains one specific routine — reached from that routine's own
// routine/[id].tsx detail screen's "Start training" button, which only
// shows for routines currently in rotation. Any in-rotation routine can be
// trained this way, not just a single "active" one (see
// useRoutinesInRotation in useRoutines.ts).
export default function CompleteRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { routine, isLoading } = useRoutine(id);
  const createExerciseLog = useCreateExerciseLog();

  const [draft, setDraft] = useState(() => initExerciseLogDraft(routine?.exercises ?? []));
  const [generalNote, setGeneralNote] = useState('');
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [painAfter, setPainAfter] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // `draft` is seeded from the routine at mount time (useState initializer)
  // — if this screen were ever reached before the routine query resolved,
  // re-seed here rather than showing an empty checklist.
  const exercises = routine.exercises;
  const resolvedDraft = Object.keys(draft).length > 0 ? draft : initExerciseLogDraft(exercises);

  const handleSave = async () => {
    const completedExercises = buildCompletedExercises(exercises, resolvedDraft);
    const status = computeExerciseLogStatus(completedExercises);

    setIsSubmitting(true);
    const { error } = await createExerciseLog.mutateAsync({
      routine_id: routine.id,
      status,
      completed_exercises: completedExercises,
      general_note: generalNote.trim() || null,
      pain_before: painBefore,
      pain_after: painAfter,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t(trainingSavedToastKey(painBefore, painAfter), { before: painBefore ?? '', after: painAfter ?? '' }));
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
        <Text className="text-xl font-bold text-black dark:text-white">{routine.title}</Text>

        {/* Optional before/after pain — the "is it working?" payoff. Rests at
            the middle untouched and saves null unless actually set. */}
        <PainSlider label={t('routine.painBefore')} value={painBefore} onChange={setPainBefore} restAtMidpoint />

        <ExerciseLogChecklist exercises={exercises} draft={resolvedDraft} onChange={setDraft} />

        <PainSlider label={t('routine.painAfter')} value={painAfter} onChange={setPainAfter} restAtMidpoint />

        <Input
          label={t('routine.generalNoteLabel')}
          placeholder={t('routine.generalNotePlaceholder')}
          multiline
          numberOfLines={3}
          value={generalNote}
          onChangeText={setGeneralNote}
        />
      </ScrollView>

      <View className="px-6 pb-12">
        <Pressable
          onPress={handleSave}
          disabled={isSubmitting}
          className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('routine.saveLog')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
