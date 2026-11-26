import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { buildTrainingCelebration } from '@/components/oak/oakConfig';
import {
  buildTrainingInsert,
  EMPTY_TRAINING_FORM,
  TrainingLogBody,
  type TrainingFormValue,
} from '@/components/training/TrainingLogBody';
import { useExercises } from '@/hooks/useExercises';
import { useCreateExerciseLog, useOakWaterings } from '@/hooks/useExerciseLogs';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';
import { usePresets } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { applyPreset } from '@/lib/trainingLog';
import { useTrainingCelebrationStore } from '@/store/useTrainingCelebrationStore';
import { toast } from '@/utils/toast';

// Log a workout: tick what you did (optionally starting from a preset via
// `?preset=<routine id>`), type anything new, Save. Free — it's part of the
// daily habit; only the AI import is Premium. A saved workout waters the
// training oak (TrainingCelebrationHost) instead of showing a toast.
export default function TrainingLogScreen() {
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const { preset: presetParam } = useLocalSearchParams<{ preset?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { exercises } = useExercises();
  const { presets, isLoading: presetsLoading } = usePresets();
  const createLog = useCreateExerciseLog();
  const { waterings, wateredToday } = useOakWaterings();

  const [form, setForm] = useState<TrainingFormValue>(EMPTY_TRAINING_FORM);
  const [seededPreset, setSeededPreset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-tick the preset from the URL once presets have loaded (state set
  // during render on a guarded flag, not in an effect).
  if (!seededPreset && !presetsLoading) {
    setSeededPreset(true);
    const preset = presets.find((p) => p.id === presetParam);
    if (preset) setForm({ ...form, draft: applyPreset(form.draft, preset.exercise_ids) });
  }

  const canSave = form.draft.ticked.some((id) => exercises.some((exercise) => exercise.id === id));

  const handleSave = async () => {
    const insert = buildTrainingInsert(form, exercises, presets);
    if (!insert) return;

    // Captured before the save: the save invalidates the count, and a
    // refetch landing first would make this workout look already counted.
    const celebration = buildTrainingCelebration(waterings, wateredToday);
    setIsSaving(true);
    const { error } = await createLog.mutateAsync(insert);
    setIsSaving(false);
    if (error) {
      toast.error(error);
      return;
    }

    // The oak celebration replaced the success toast. Show it first, then
    // pop underneath it (same order as the check-in celebration).
    useTrainingCelebrationStore.getState().show(celebration);
    router.back();
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView
        {...keepFocusedVisible}
        className="flex-1"
        contentContainerClassName="px-5 py-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <TrainingLogBody value={form} onChange={setForm} />
      </ScrollView>

      <View className="gap-2 px-5 pb-10 pt-3">
        <Pressable
          onPress={handleSave}
          disabled={!canSave || isSaving}
          className="items-center rounded-xl bg-primary py-4 disabled:opacity-40 dark:bg-primaryDark"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-nav text-white">{t('training.save')}</Text>
          )}
        </Pressable>
        {!canSave && <Text className="text-center text-caption text-gray">{t('training.tickAtLeastOne')}</Text>}
      </View>
    </View>
  );
}
