import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveRoutine } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

// Read-only view of the active routine — reached either right after
// generation (routine/new.tsx routes here as its "confirmation" step, so the
// user sees exactly what was generated before doing anything with it) or via
// TodaysRoutineCard's "View routine" button on any later visit. Actually
// starting/logging the routine happens on routine/complete.tsx, not here.
export default function ViewRoutineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { routine, isLoading } = useActiveRoutine();
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
        <Text className="text-center text-gray-500 dark:text-gray">{t('routine.noActiveRoutine')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 py-6">
        <Text className="text-xl font-bold text-black dark:text-white">{routine.title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray">
          {t('routine.exerciseCount', { count: routine.exercises.length })}
        </Text>

        {routine.exercises.map((exercise) => {
          const isExpanded = expandedIds.has(exercise.id);
          return (
            <View
              key={exercise.id}
              className="gap-1.5 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark"
            >
              <Pressable
                onPress={() => toggleExpanded(exercise.id)}
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
      </ScrollView>

      <View className="px-6 pb-12">
        <Pressable
          onPress={() => router.push('/routine/complete')}
          className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90"
        >
          <Text className="font-semibold text-white">{t('routine.startTraining')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
