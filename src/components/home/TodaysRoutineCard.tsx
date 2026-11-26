import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useExercises } from '@/hooks/useExercises';
import { useTodayTrainingLog } from '@/hooks/useExerciseLogs';
import { formatTime } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

// Home "Training" card: a status glance, not a browsing surface. Either
// today's workout is logged, or one button to log it. Logging, the
// exercise list and presets are free; the library itself lives on
// training/exercises.tsx ("My exercises").
export function TodaysRoutineCard() {
  const { t } = useTranslation();
  const { log, isLoading: logLoading } = useTodayTrainingLog();
  const { exercises, isLoading: exercisesLoading } = useExercises();

  if (logLoading || exercisesLoading) {
    return (
      <View className="items-center rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View className="flex-row items-center justify-between">
        <Text className="text-heading text-black dark:text-white">{t('training.title')}</Text>
        <Link href={'/training/exercises' as Href} asChild>
          <Pressable hitSlop={8} className="flex-row items-center gap-1">
            <Text className="text-label font-semibold text-accent dark:text-primaryDark">{t('training.myExercises')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </Pressable>
        </Link>
      </View>

      {log ? (
        <View className="flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
          <Text className="flex-1 text-label text-ink dark:text-white">
            {t('training.loggedToday', { time: formatTime(log.logged_at) })}
          </Text>
        </View>
      ) : (
        <>
          {exercises.length === 0 && <Text className="text-label text-gray">{t('training.emptyCardBody')}</Text>}
          <Link href={'/training/log' as Href} asChild>
            <Pressable className="items-center rounded-xl bg-primary py-3 active:opacity-90 dark:bg-primaryDark">
              <Text className="font-semibold text-white">{t('training.logTraining')}</Text>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}
