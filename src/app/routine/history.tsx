import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveRoutine, useRoutineHistory } from '@/hooks/useRoutines';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Old routines are never deleted — is_active just flips to false when a new
// one is created (see supabase_routines_migration.sql's deactivate trigger).
// This screen is what makes that history actually browsable/useful, rather
// than just sitting invisible in the DB.
export default function RoutineHistoryScreen() {
  const { t } = useTranslation();
  const { routines, isLoading } = useRoutineHistory();
  const { routine: activeRoutine } = useActiveRoutine();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (routines.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray-500 dark:text-gray">{t('routine.noRoutinesYet')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-3 px-6 py-6">
      {routines.map((routine) => {
        const isActive = routine.id === activeRoutine?.id;
        return (
          <Link key={routine.id} href={`/routine/${routine.id}` as Href} asChild>
            <Pressable className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark active:opacity-70">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-black dark:text-white">{routine.title}</Text>
                  {isActive && (
                    <View className="rounded-full bg-primaryMuted px-2 py-0.5 dark:bg-primaryMutedDark">
                      <Text className="text-xs font-semibold text-primary dark:text-primaryDark">
                        {t('routine.activeBadge')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-gray-500 dark:text-gray">
                  {formatCheckinDate(routine.created_at.slice(0, 10))} ·{' '}
                  {t('routine.exerciseCount', { count: routine.exercises.length })}
                </Text>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}
