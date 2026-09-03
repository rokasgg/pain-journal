import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { Input } from '@/components/ui/Input';
import type { ExerciseLogDraft } from '@/lib/exerciseLog';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { RoutineExercise } from '@/types/database.types';

export interface ExerciseLogChecklistProps {
  exercises: RoutineExercise[];
  draft: ExerciseLogDraft;
  onChange: (draft: ExerciseLogDraft) => void;
  className?: string;
}

// Shared per-exercise checkbox/slider/note row list — used by both the full
// "Atlikti treniruotę" screen (routine/complete.tsx) and the condensed
// checklist embedded in the evening check-in (ExerciseRoutineCheckinCard.tsx),
// so both build the exact same draft shape (see src/lib/exerciseLog.ts).
//
// The checkbox only ever toggles completion — it never expands anything. A
// separate chevron expands/collapses the row in place to reveal the
// discomfort slider + note (same accordion pattern as routine/view.tsx's
// exercise list). An earlier version put the slider/note behind a "..."
// popup modal instead — replaced because a collapsed row gave no visual cue
// that a value was already set behind it; the chevron itself now carries
// that signal (primary-colored once a value exists) so it's visible even
// collapsed.
export function ExerciseLogChecklist({ exercises, draft, onChange }: ExerciseLogChecklistProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const updateEntry = (id: string, patch: Partial<ExerciseLogDraft[string]>) => {
    onChange({ ...draft, [id]: { ...draft[id], ...patch } });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // "Select all" doubles as "deselect all" once everything's already
  // checked — same toggle-by-current-state convention as a standard
  // select-all checkbox. Only touches `completed`; any discomfort/note
  // already entered per exercise is left alone.
  const allCompleted = exercises.length > 0 && exercises.every((exercise) => draft[exercise.id]?.completed);

  const toggleSelectAll = () => {
    const next = { ...draft };
    for (const exercise of exercises) {
      next[exercise.id] = { ...next[exercise.id], completed: !allCompleted };
    }
    onChange(next);
  };

  return (
    <View className="gap-4">
      <Pressable
        onPress={toggleSelectAll}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allCompleted }}
        className="flex-row items-center gap-2 self-start"
      >
        <Ionicons
          name={allCompleted ? 'checkbox' : 'square-outline'}
          size={18}
          color={allCompleted ? colors.primary : colors.gray}
        />
        <Text className="text-sm font-medium text-primary dark:text-primaryDark">
          {t(allCompleted ? 'routine.deselectAll' : 'routine.selectAll')}
        </Text>
      </Pressable>

      {exercises.map((exercise) => {
        const entry = draft[exercise.id] ?? { completed: false, painDiscomfortLevel: 0, note: '' };
        const hasDetail = entry.painDiscomfortLevel > 0 || entry.note.trim().length > 0;
        const isExpanded = expandedIds.has(exercise.id);

        return (
          <View
            key={exercise.id}
            className="gap-3 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark"
          >
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => updateEntry(exercise.id, { completed: !entry.completed })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: entry.completed }}
                className="flex-1 flex-row items-start gap-3"
              >
                <Ionicons
                  name={entry.completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={entry.completed ? colors.primary : colors.gray}
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-black dark:text-white">{exercise.name}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray">
                    {exercise.muscle_group} · {exercise.target_sets_reps}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => toggleExpanded(exercise.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityLabel={t('routine.exerciseDetailButton', { name: exercise.name })}
                hitSlop={8}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={hasDetail ? colors.primary : colors.gray}
                />
              </Pressable>
            </View>

            {isExpanded && (
              <View className="gap-3 pt-1">
                <PainSlider
                  label={t('routine.discomfortDuringExercise')}
                  value={entry.painDiscomfortLevel}
                  onChange={(value) => updateEntry(exercise.id, { painDiscomfortLevel: value })}
                />

                <Input
                  placeholder={t('routine.exerciseNotePlaceholder')}
                  value={entry.note}
                  onChangeText={(text) => updateEntry(exercise.id, { note: text })}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
