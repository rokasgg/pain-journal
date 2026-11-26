import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { PillChip } from '@/components/flareup/ChoiceChips';
import { PainSlider } from '@/components/checkin/PainSlider';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { TrainingChecklist } from '@/components/training/TrainingChecklist';
import { Input } from '@/components/ui/Input';
import { useCreateExercise, useExercises } from '@/hooks/useExercises';
import { usePremium } from '@/hooks/usePremium';
import { paywallHref } from '@/hooks/usePremiumAction';
import { useShownPresets } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import {
  applyPreset,
  buildTrainingLog,
  EMPTY_TRAINING_DRAFT,
  isPresetApplied,
  tick,
  type BuiltTrainingLog,
  type TrainingDraft,
} from '@/lib/trainingLog';
import type { Exercise, Routine } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

export interface TrainingFormValue {
  draft: TrainingDraft;
  painBefore: number | null;
  painAfter: number | null;
  generalNote: string;
}

export const EMPTY_TRAINING_FORM: TrainingFormValue = {
  draft: EMPTY_TRAINING_DRAFT,
  painBefore: null,
  painAfter: null,
  generalNote: '',
};

/** The exercise_logs insert for a form, or null when nothing is ticked. */
export function buildTrainingInsert(
  value: TrainingFormValue,
  exercises: Exercise[],
  presets: Pick<Routine, 'id' | 'exercise_ids'>[],
): (BuiltTrainingLog & { general_note: string | null; pain_before: number | null; pain_after: number | null }) | null {
  const built = buildTrainingLog(value.draft, exercises, presets);
  if (!built) return null;
  return {
    ...built,
    general_note: value.generalNote.trim() || null,
    pain_before: value.painBefore,
    pain_after: value.painAfter,
  };
}

export interface TrainingLogBodyProps {
  value: TrainingFormValue;
  onChange: (value: TrainingFormValue) => void;
}

// The one way a workout is logged (training/log.tsx and the evening
// check-in's training step): preset chips that pre-tick, the library as a
// tick list, a field to type a new exercise on the spot, and an optional,
// collapsed "How did it feel?" with before/after pain + a note.
export function TrainingLogBody({ value, onChange }: TrainingLogBodyProps) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { exercises, isLoading } = useExercises();
  const { presets } = useShownPresets();
  const createExercise = useCreateExercise();

  const [newName, setNewName] = useState('');
  const [feelOpen, setFeelOpen] = useState(
    value.painBefore != null || value.painAfter != null || value.generalNote.length > 0,
  );

  const libraryIds = new Set(exercises.map((exercise) => exercise.id));
  // A preset only counts the exercises still in the library (not archived).
  const presetChips = presets
    .map((preset) => ({ ...preset, ids: preset.exercise_ids.filter((id) => libraryIds.has(id)) }))
    .filter((preset) => preset.ids.length > 0);

  const setDraft = (draft: TrainingDraft) => onChange({ ...value, draft });

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || createExercise.isPending) return;
    const { id, error } = await createExercise.mutateAsync({ name });
    if (error || !id) {
      toast.error(error ?? t('training.addFailed'));
      return;
    }
    haptics.tick();
    setNewName('');
    setDraft(tick(value.draft, id));
  };

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="gap-5">
      {presetChips.length > 0 && (
        <View className="gap-2">
          <Text className="text-heading text-black dark:text-white">{t('training.presetsLabel')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {presetChips.map((preset) => (
              <PillChip
                key={preset.id}
                label={preset.title}
                selected={isPresetApplied(value.draft, preset.ids)}
                showCheck
                onPress={() => {
                  haptics.tick();
                  setDraft(applyPreset(value.draft, preset.ids));
                }}
              />
            ))}
          </View>
        </View>
      )}

      <View className="gap-2">
        <Text className="text-heading text-black dark:text-white">{t('training.whatDidYouDo')}</Text>
        {exercises.length > 0 ? (
          <TrainingChecklist exercises={exercises} draft={value.draft} onChange={setDraft} />
        ) : (
          <Text className="text-label text-gray">{t('training.noExercisesYet')}</Text>
        )}

        <View className="flex-row items-center gap-2">
          <Input
            className="flex-1"
            placeholder={t('training.addExercisePlaceholder')}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            submitBehavior="submit"
            autoCapitalize="sentences"
            maxLength={80}
          />
          <Pressable
            onPress={handleAdd}
            disabled={!newName.trim() || createExercise.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('training.addExerciseA11y')}
            className="h-12 w-12 items-center justify-center rounded-lg bg-primary disabled:opacity-40 dark:bg-primaryDark"
          >
            {createExercise.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons name="add" size={24} color={colors.white} />
            )}
          </Pressable>
        </View>

        {exercises.length === 0 && (
          <Link href={(isPremium ? '/routine/new' : paywallHref('routines')) as Href} asChild>
            <Pressable className="flex-row items-center gap-2 self-start py-1">
              <Ionicons name="document-text-outline" size={16} color={colors.accent} />
              <Text className="text-label font-semibold text-accent dark:text-primaryDark">{t('training.importLink')}</Text>
              {!isPremium && <PremiumBadge size={10} />}
            </Pressable>
          </Link>
        )}
      </View>

      <View className="gap-3">
        <Pressable
          onPress={() => setFeelOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: feelOpen }}
          className="flex-row items-center gap-2 self-start py-1"
        >
          <Ionicons name={feelOpen ? 'remove' : 'add'} size={18} color={colors.accent} />
          <Text className="text-label font-semibold text-accent dark:text-primaryDark">{t('training.howDidItFeel')}</Text>
          <Text className="text-caption text-gray">{t('training.optional')}</Text>
        </Pressable>

        {feelOpen && (
          <View className="gap-4">
            <PainSlider
              label={t('routine.painBefore')}
              value={value.painBefore}
              onChange={(painBefore) => onChange({ ...value, painBefore })}
              restAtMidpoint
            />
            <PainSlider
              label={t('routine.painAfter')}
              value={value.painAfter}
              onChange={(painAfter) => onChange({ ...value, painAfter })}
              restAtMidpoint
            />
            <Input
              label={t('routine.generalNoteLabel')}
              placeholder={t('training.generalNotePlaceholder')}
              multiline
              numberOfLines={2}
              value={value.generalNote}
              onChangeText={(generalNote) => onChange({ ...value, generalNote })}
            />
          </View>
        )}
      </View>
    </View>
  );
}
