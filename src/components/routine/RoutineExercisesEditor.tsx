import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { RoutineExercise } from '@/types/database.types';

export interface RoutineExercisesEditorProps {
  exercises: RoutineExercise[];
  onUpdateExercise: (id: string, patch: Partial<RoutineExercise>) => void;
  onRemoveExercise: (id: string) => void;
}

// Editable per-exercise card list — shared between routine/review.tsx (the
// AI-generated draft, before it's ever saved) and routine/edit/[id].tsx (an
// already-saved routine), so the two don't duplicate this form.
export function RoutineExercisesEditor({ exercises, onUpdateExercise, onRemoveExercise }: RoutineExercisesEditorProps) {
  const { t } = useTranslation();

  return (
    <>
      {exercises.map((exercise) => (
        <View
          key={exercise.id}
          className="gap-3 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
              {t('routine.exercise')}
            </Text>
            <Pressable
              onPress={() => onRemoveExercise(exercise.id)}
              accessibilityRole="button"
              accessibilityLabel={t('routine.removeExercise', { name: exercise.name })}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.gray} />
            </Pressable>
          </View>

          <Input
            label={t('routine.exerciseNameLabel')}
            value={exercise.name}
            onChangeText={(text) => onUpdateExercise(exercise.id, { name: text })}
          />
          <Input
            label={t('routine.muscleGroupLabel')}
            value={exercise.muscle_group}
            onChangeText={(text) => onUpdateExercise(exercise.id, { muscle_group: text })}
          />
          <Input
            label={t('routine.targetSetsRepsLabel')}
            value={exercise.target_sets_reps}
            onChangeText={(text) => onUpdateExercise(exercise.id, { target_sets_reps: text })}
          />
          <Input
            label={t('routine.instructionsLabel')}
            multiline
            numberOfLines={2}
            value={exercise.instructions}
            onChangeText={(text) => onUpdateExercise(exercise.id, { instructions: text })}
          />
          <Input
            label={t('routine.cautionNotesLabel')}
            multiline
            numberOfLines={2}
            value={exercise.caution_notes}
            onChangeText={(text) => onUpdateExercise(exercise.id, { caution_notes: text })}
          />
        </View>
      ))}

      {exercises.length === 0 && (
        <Text className="text-center text-sm text-gray-500 dark:text-gray">{t('routine.noExercisesLeft')}</Text>
      )}
    </>
  );
}
