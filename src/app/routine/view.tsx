import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { RoutineExerciseList } from '@/components/routine/RoutineExerciseList';
import { useActiveRoutine } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Read-only view of the active routine — reached either right after a save
// on routine/review.tsx (so the user sees exactly what was saved before
// doing anything with it) or via TodaysRoutineCard's "View routine" button
// on any later visit. Actually starting/logging the routine happens on
// routine/complete.tsx, not here.
export default function ViewRoutineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { routine, isLoading } = useActiveRoutine();

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

        <RoutineExerciseList exercises={routine.exercises} />
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
