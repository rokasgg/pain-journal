import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Replaces the old static "Today's focus" widget (which grouped the latest
// physio visit's tight/weak muscle findings) now that routines are a real,
// AI-generated/hand-entered thing of their own — see generate-routine edge
// function + the `routines` table.
//
// Deliberately minimal: routine title(s) + exercise count, and links — no
// exercise list/checkboxes here. Explicit product decision: a full checklist
// on Home read as cluttered; the exercise list (read-only, with a "Start
// training" button) lives on routine/[id].tsx, and actually logging a
// routine only happens through routine/complete/[id].tsx or the evening
// check-in's condensed checklist, never from a Home-screen widget.
//
// Any number of routines can be "in rotation" at once now (e.g. alternating
// physio-prescribed routines by day) — see useRoutinesInRotation in
// useRoutines.ts. With exactly one, this card behaves like it always did
// (title + count, now a direct link to that routine); with more than one, it
// lists each so the user can pick which one to do today.
//
// Always renders a card, even with none in rotation yet (an empty-state
// message instead of `return null`) — a card that silently disappears when
// there's nothing to show reads as "this feature doesn't exist" rather than
// "you haven't generated a routine yet". Rendered on both Home
// ((tabs)/index.tsx) and Insights ((tabs)/insights.tsx) for now.
export function TodaysRoutineCard() {
  const { t } = useTranslation();
  const { routines, isLoading } = useRoutinesInRotation();

  if (isLoading) {
    return (
      <View className="items-center gap-4 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (routines.length === 0) {
    return (
      <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-base font-semibold text-black dark:text-white">{t('routine.todaysRoutineTitle')}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.noRoutinesInRotation')}</Text>
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
      <View className="gap-2">
        {routines.map((routine) => (
          <Link key={routine.id} href={`/routine/${routine.id}` as Href} asChild>
            <Pressable
              className={
                routines.length > 1
                  ? 'flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800 active:opacity-70'
                  : 'active:opacity-70'
              }
            >
              <Text className="text-base font-semibold text-black dark:text-white">{routine.title}</Text>
              <Text className="text-sm text-gray-500 dark:text-gray">
                {t('routine.exerciseCount', { count: routine.exercises.length })}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Link href={'/routine/view' as Href} asChild>
        <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90">
          <Text className="font-semibold text-white">{t('routine.viewRoutine')}</Text>
        </Pressable>
      </Link>

      <Link href={'/routine/new' as Href} asChild>
        <Pressable className="items-center py-1">
          <Text className="text-sm font-medium text-primary dark:text-primaryDark">{t('routine.newRoutine')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
