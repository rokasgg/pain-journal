import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTodayExerciseLogForAny } from '@/hooks/useExerciseLogs';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { formatTime } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Replaces the old static "Today's focus" widget (which grouped the latest
// physio visit's tight/weak muscle findings) now that routines are a real,
// AI-generated/hand-entered thing of their own — see generate-routine edge
// function + the `routines` table.
//
// Deliberately minimal — a status glance, not a browsing surface: either
// today's training is already logged, or a button to do it. No exercise
// list/checkboxes/per-routine rows here; the exercise list (read-only, with
// a "Start training" button) lives on routine/[id].tsx, browsing every
// routine lives on routine/view.tsx (also where "+ New routine" now lives,
// via its header button), and actually logging a routine only happens
// through routine/complete/[id].tsx or the evening check-in's condensed
// checklist — never from this Home-screen widget. An earlier version listed
// every in-rotation routine as its own row here, which read as busy once
// more than one routine was in rotation at once (see useRoutinesInRotation
// in useRoutines.ts) — replaced by this single status + one CTA.
//
// "Has anything been logged today?" reuses useTodayExerciseLogForAny(), the
// same hook RoutineTrainingStep.tsx's evening check-in step already uses —
// a user is assumed to log at most one routine per day (e.g. alternating
// Day A / Day B), so this stays a single yes/no across every in-rotation
// routine, not tracked per routine.
//
// Always renders a card, even with none in rotation yet (an empty-state
// message instead of `return null`) — a card that silently disappears when
// there's nothing to show reads as "this feature doesn't exist" rather than
// "you haven't generated a routine yet". Rendered on both Home
// ((tabs)/index.tsx) and Insights ((tabs)/insights.tsx) for now.
export function TodaysRoutineCard() {
  const { t } = useTranslation();
  const { routines, isLoading } = useRoutinesInRotation();
  const routineIds = routines.map((r) => r.id);
  const { log } = useTodayExerciseLogForAny(routineIds);

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

  // With exactly one routine in rotation, jump straight into it; with more
  // than one, the user picks which one on the list (same "user picks each
  // day" model as everywhere else this comes up).
  const completeHref = (routines.length === 1 ? `/routine/complete/${routines[0].id}` : '/routine/view') as Href;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-semibold text-black dark:text-white">{t('routine.todaysRoutineTitle')}</Text>

      {log ? (
        <Text className="text-sm text-gray-500 dark:text-gray">
          {t('routine.alreadyLoggedTitle', { time: formatTime(log.logged_at) })}
        </Text>
      ) : (
        <Link href={completeHref} asChild>
          <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark active:opacity-90">
            <Text className="font-semibold text-white">{t('routine.completeRoutine')}</Text>
          </Pressable>
        </Link>
      )}

      <Link href={'/routine/view' as Href} asChild>
        <Pressable className="items-center py-1">
          <Text className="text-sm font-medium text-primary dark:text-primaryDark">{t('routine.viewRoutine')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
