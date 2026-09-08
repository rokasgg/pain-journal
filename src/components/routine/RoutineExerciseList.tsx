import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/lib/theme';
import type { RoutineExercise } from '@/types/database.types';

export interface RoutineExerciseListProps {
  exercises: RoutineExercise[];
  // Optional — wired up by routine/review.tsx's summary step so long-
  // pressing a card can open an Edit/Delete action sheet. Other callers
  // (routine/[id].tsx) omit it and get today's plain expand/collapse-only
  // behavior.
  onLongPressExercise?: (exercise: RoutineExercise) => void;
}

// Read-only, expandable exercise list — shared between routine/[id].tsx (any
// routine, active or from history) and routine/review.tsx's final summary
// step, so the different screens don't duplicate this presentation.
export function RoutineExerciseList({ exercises, onLongPressExercise }: RoutineExerciseListProps) {
  // Each exercise expands/collapses independently, not a single-expand
  // accordion — a Set of currently-expanded exercise ids.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {exercises.map((exercise) => {
        const isExpanded = expandedIds.has(exercise.id);
        return (
          <View
            key={exercise.id}
            className="gap-1.5 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark"
          >
            <Pressable
              onPress={() => toggleExpanded(exercise.id)}
              onLongPress={onLongPressExercise ? () => onLongPressExercise(exercise) : undefined}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-black dark:text-white">{exercise.name}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray">
                  {exercise.muscle_group} · {exercise.target_sets_reps}
                </Text>
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray} />
            </Pressable>

            {isExpanded && (
              <View className="gap-1.5 pt-1.5">
                <Text className="text-sm text-black dark:text-white">{exercise.instructions}</Text>
                <Text className="text-xs italic text-amber-700 dark:text-amber-500">{exercise.caution_notes}</Text>
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}
