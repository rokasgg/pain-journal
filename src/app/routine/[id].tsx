import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { RoutineExerciseList } from '@/components/routine/RoutineExerciseList';
import { useRoutine } from '@/hooks/useRoutines';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Full review of one routine — expandable exercise list, reached from
// routine/view.tsx's list (newest first) or right after generating a new one
// (routine/review.tsx replaces into here on save). "Start training" shows
// whenever this routine is currently in rotation — any number of routines
// can be, so this isn't restricted to a single "active" one anymore (see
// useRoutinesInRotation in useRoutines.ts); reopening one that's been
// removed from rotation is for reference only.
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { routine, isLoading } = useRoutine(id);

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

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 py-6">
        <Text className="text-xl font-bold text-black dark:text-white">{routine.title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray">
          {formatCheckinDate(routine.created_at.slice(0, 10))} ·{' '}
          {t('routine.exerciseCount', { count: routine.exercises.length })}
        </Text>

        <RoutineExerciseList exercises={routine.exercises} />
      </ScrollView>

      {routine.in_rotation && (
        <View className="px-6 pb-12">
          <Pressable
            onPress={() => router.push(`/routine/complete/${routine.id}` as Href)}
            className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90"
          >
            <Text className="font-semibold text-white">{t('routine.startTraining')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
