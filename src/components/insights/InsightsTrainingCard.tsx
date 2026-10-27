import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';

import { BOLD_MARK, TextWithBold } from '@/components/ui/TextWithBold';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory, useTodayExerciseLogForAny } from '@/hooks/useExerciseLogs';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { formatOneDecimal, formatTime, todayLocalDate } from '@/lib/dates';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { MIN_RELIEF_SESSIONS, trainingReliefSummary, trainingVsRestNextDayPain } from '@/lib/trainingInsights';

const LOOKBACK_DAYS = 42;
// Below this, next-day pain after training vs rest reads as noise.
const MIN_MEANINGFUL_GAP = 0.3;

// Insights → Training: today's workout (one primary action) plus "Is it
// helping?". Until there are MIN_RELIEF_SESSIONS workouts with pain marked
// before and after, that half is a progress bar towards the answer instead
// of an empty state. Home keeps its own TodaysRoutineCard.
export function InsightsTrainingCard() {
  const { t, locale } = useTranslation();
  const { routines, isLoading } = useRoutinesInRotation();
  const { log } = useTodayExerciseLogForAny(routines.map((r) => r.id));
  const { logs } = useExerciseLogHistory(LOOKBACK_DAYS);
  const { checkins } = useCheckinHistory(LOOKBACK_DAYS);
  // Segment colours are runtime styles, so dark mode picks its own track.
  const trackColor = useColorScheme() === 'dark' ? colors.segmentTrackDark : colors.segmentTrack;

  const { relief, nextDay, paired } = useMemo(
    () => ({
      relief: trainingReliefSummary(logs),
      nextDay: trainingVsRestNextDayPain(logs, checkins, todayLocalDate()),
      paired: logs.filter((l) => l.status !== 'SKIPPED' && l.pain_before != null && l.pain_after != null).length,
    }),
    [logs, checkins],
  );

  if (isLoading) {
    return (
      <View className="items-center rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (routines.length === 0) {
    return (
      <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-[17px] font-semibold text-ink dark:text-white">{t('routine.todaysRoutineTitle')}</Text>
        <Text className="text-sm text-inkSecondary dark:text-gray">{t('routine.noRoutinesInRotation')}</Text>
        <Link href={'/routine/new' as Href} asChild>
          <Pressable className="h-12 items-center justify-center rounded-xl bg-accent active:opacity-90 dark:bg-primaryDark">
            <Text className="text-base font-semibold text-white">{t('routine.createRoutine')}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const single = routines.length === 1 ? routines[0] : null;
  const subtitle = single
    ? `${single.title} · ${formatCount(single.exercises.length, 'exercise', locale)}`
    : t('insights.routinesInRotation', { count: formatCount(routines.length, 'routine', locale) });
  const completeHref = (single ? `/routine/complete/${single.id}` : '/routine/view') as Href;
  const exercisesHref = (single ? `/routine/${single.id}` : '/routine/view') as Href;
  const remaining = Math.max(MIN_RELIEF_SESSIONS - paired, 0);

  return (
    <View className="rounded-[18px] bg-surface dark:bg-surfaceDark">
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-accentMuted dark:bg-segmentTrackDark">
            <Ionicons name="barbell-outline" size={22} color={colors.accent} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-[17px] font-semibold text-ink dark:text-white">{t('routine.todaysRoutineTitle')}</Text>
            <Text className="text-sm text-inkSecondary dark:text-gray" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        {log ? (
          <Text className="text-sm text-inkSecondary dark:text-gray">
            {t('routine.alreadyLoggedTitle', { time: formatTime(log.logged_at) })}
          </Text>
        ) : (
          <Link href={completeHref} asChild>
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-xl bg-accent active:opacity-90 dark:bg-primaryDark"
            >
              <Text className="text-base font-semibold text-white">{t('routine.completeRoutine')}</Text>
            </Pressable>
          </Link>
        )}

        <Link href={exercisesHref} asChild>
          <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center active:opacity-60">
            <Text className="text-base font-semibold text-accent dark:text-primaryDark">
              {t('insights.viewExercises')}
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="gap-2.5 border-t border-borderLight p-4 dark:border-borderDark">
        <Text className="text-base font-semibold text-ink dark:text-white">{t('training.payoffTitle')}</Text>
        {relief ? (
          <>
            <Text className="text-sm text-ink dark:text-white">
              {relief.avgDrop > 0
                ? t('training.reliefValue', { drop: formatOneDecimal(relief.avgDrop, locale), count: relief.sessions })
                : t('training.reliefNoDrop', { count: relief.sessions })}
            </Text>
            {nextDay && (
              <Text className="text-sm text-inkSecondary dark:text-gray">
                {Math.abs(nextDay.afterRest - nextDay.afterTraining) < MIN_MEANINGFUL_GAP
                  ? t('training.nextDayNoDifference')
                  : t('training.nextDayValue', {
                    training: formatOneDecimal(nextDay.afterTraining, locale),
                    rest: formatOneDecimal(nextDay.afterRest, locale),
                  })}
              </Text>
            )}
          </>
        ) : (
          <>
            <View className="flex-row gap-1.5">
              {Array.from({ length: MIN_RELIEF_SESSIONS }, (_, index) => (
                <View
                  key={index}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ backgroundColor: index < paired ? colors.accent : trackColor }}
                />
              ))}
            </View>
            <TextWithBold
              className="text-sm text-inkSecondary dark:text-gray"
              text={t('insights.helpingProgress', { count: BOLD_MARK })}
              bold={formatCount(remaining, 'workoutGen', locale)}
              boldClassName="text-ink dark:text-white"
            />
          </>
        )}
      </View>
    </View>
  );
}
