import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { RoutineExerciseList } from '@/components/routine/RoutineExerciseList';
import { useRoutine } from '@/hooks/useRoutines';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Read-only view of any past routine, reached from routine/history.tsx — no
// "start training" button here. Only the *active* routine can be trained
// against (routine/complete.tsx always operates on useActiveRoutine());
// reopening an old one from history is for reference only, since logging
// against a non-active routine would fight the one-active-routine model.
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      <Text className="text-xl font-bold text-black dark:text-white">{routine.title}</Text>
      <Text className="text-sm text-gray-500 dark:text-gray">
        {formatCheckinDate(routine.created_at.slice(0, 10))} ·{' '}
        {t('routine.exerciseCount', { count: routine.exercises.length })}
      </Text>

      <RoutineExerciseList exercises={routine.exercises} />
    </ScrollView>
  );
}
