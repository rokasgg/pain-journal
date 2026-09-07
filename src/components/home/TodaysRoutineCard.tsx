import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useActiveRoutine } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Replaces the old static "Today's focus" widget (which grouped the latest
// physio visit's tight/weak muscle findings) now that routines are a real,
// AI-generated/hand-entered thing of their own — see generate-routine edge
// function + the `routines` table.
//
// Deliberately minimal: just the routine title, an exercise count, and a
// "View routine" link — no exercise list/checkboxes here. Explicit product
// decision: a full checklist on Home read as cluttered; the exercise list
// (read-only) lives on routine/view.tsx, and actually logging a routine only
// happens through routine/complete.tsx or the evening check-in's condensed
// checklist, never from a Home-screen widget.
//
// Always renders a card, even with no active routine yet (an empty-state
// message instead of `return null`) — a card that silently disappears when
// there's nothing to show reads as "this feature doesn't exist" rather than
// "you haven't generated a routine yet". Rendered on both Home
// ((tabs)/index.tsx) and Insights ((tabs)/insights.tsx) for now.
export function TodaysRoutineCard() {
  const { t } = useTranslation();
  const { routine, isLoading } = useActiveRoutine();

  if (isLoading) {
    return (
      <View className="items-center gap-4 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (!routine) {
    return (
      <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-base font-semibold text-black dark:text-white">{t('routine.todaysRoutineTitle')}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.noActiveRoutine')}</Text>
        <Link href={'/routine/new' as Href} asChild>
          <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90">
            <Text className="font-semibold text-white">{t('routine.createRoutine')}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View>
        <Text className="text-base font-semibold text-black dark:text-white">{routine.title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray">
          {t('routine.exerciseCount', { count: routine.exercises.length })}
        </Text>
      </View>

      <Link href={'/routine/view' as Href} asChild>
        <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90">
          <Text className="font-semibold text-white">{t('routine.viewRoutine')}</Text>
        </Pressable>
      </Link>

      <View className="flex-row justify-center gap-4">
        <Link href={'/routine/new' as Href} asChild>
          <Pressable className="items-center py-1">
            <Text className="text-sm font-medium text-primary dark:text-primaryDark">{t('routine.newRoutine')}</Text>
          </Pressable>
        </Link>

        <Link href={'/routine/history' as Href} asChild>
          <Pressable className="items-center py-1">
            <Text className="text-sm font-medium text-primary dark:text-primaryDark">
              {t('routine.routineHistory')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
