import { eachDayOfInterval, endOfWeek, format, isToday, startOfWeek } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { FULL_FLAME_SVG } from '@/constants/fullFlameSvg';
import { WEEKDAY_LABELS_BY_LOCALE } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { WeeklyTrainingProgress } from '@/lib/trainingInsights';
import { useTrainingStore } from '@/store/useTrainingStore';
import { haptics } from '@/utils/haptics';

const FLAME_WIDTH = 30;
const FLAME_HEIGHT = 56;

function flameHtml(svg: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=${FLAME_WIDTH}, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

export interface ExerciseWeekCalendarProps {
  progress: WeeklyTrainingProgress;
  onChangeGoal: (goal: number) => void;
  onSelectDate: (date: string) => void;
  className?: string;
}

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// Weekly training goal, deliberately not a daily streak: physios often
// prescribe rest days, so nothing here ever "breaks" on a day off — no chain
// connectors between days, and progress is "x of goal this week".
export function ExerciseWeekCalendar({ progress, onChangeGoal, onSelectDate, className }: ExerciseWeekCalendarProps) {
  const { t, locale } = useTranslation();
  const weekdayLabels = WEEKDAY_LABELS_BY_LOCALE[locale];
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const exercisedDates = new Set(progress.trainedDays);
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false);

  // One success buzz the first time the goal is reached in a given week.
  useEffect(() => {
    if (!progress.goalMet) return;
    const { celebratedWeeks, markCelebrated } = useTrainingStore.getState();
    if (celebratedWeeks.includes(progress.weekStart)) return;
    markCelebrated(progress.weekStart);
    haptics.success();
  }, [progress.goalMet, progress.weekStart]);

  const remaining = Math.max(progress.goal - progress.count, 0);
  const footer =
    progress.weeksInARow >= 2
      ? t('training.weeksInARow', { count: progress.weeksInARow })
      : progress.goalMet
        ? t('training.goalReached')
        : t('training.remaining', { count: remaining });
  const fillPct = Math.min(progress.count / progress.goal, 1) * 100;

  const goalActions: ActionSheetAction[] = GOAL_OPTIONS.map((goal) => ({
    label: t('training.goalOption', { count: goal }),
    onPress: () => {
      setIsGoalSheetOpen(false);
      if (goal !== progress.goal) {
        haptics.tick();
        onChangeGoal(goal);
      }
    },
  }));

  return (
    <View className={`gap-3 border-primary dark:border-primaryDark  rounded-2xl bg-white p-2 dark:bg-surfaceDark ${className ?? ''}`}>

      <View className="gap-2 p-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('home.exerciseWeekTitle')}
          </Text>
          <Pressable
            onPress={() => setIsGoalSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('training.changeGoal')}
            hitSlop={8}
            className="flex-row items-baseline gap-1 rounded-full bg-primaryMuted px-3 py-1 active:opacity-70 dark:bg-primaryMutedDark"
          >
            <Text className="text-base font-bold text-black dark:text-white">
              {progress.count} / {progress.goal}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray">{t('training.thisWeek')}</Text>
          </Pressable>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-primaryMuted dark:bg-primaryMutedDark">
          <View className="h-full rounded-full bg-primary dark:bg-primaryDark" style={{ width: `${fillPct}%` }} />
        </View>
      </View>

      <View className="flex-row">
        {weekdayLabels.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row">
        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentDay = isToday(day);
          const exercised = exercisedDates.has(dateStr);

          return (
            <Pressable
              key={dateStr}
              // onPress={() => onSelectDate(dateStr)}
              className="relative flex-1 items-center gap-0.5 py-1.5"
            >
              <View
                style={{ zIndex: 1 }}
                className={`h-8 w-8 items-center justify-center rounded-full ${isCurrentDay ? 'dark:bg-primaryDark' : ''
                  }`}
              >
                <Text
                  className={`text-md ${isCurrentDay ? 'text-black font-bold' : exercised ? 'font-semibold text-white' : 'text-black dark:text-white'
                    }`}
                >
                  {format(day, 'd')}
                </Text>
              </View>

              {exercised && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 0,
                    right: 0,
                    height: 32,
                    zIndex: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: FLAME_WIDTH, height: FLAME_HEIGHT }}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: flameHtml(FULL_FLAME_SVG) }}
                      scrollEnabled={false}
                      pointerEvents="none"
                      style={{ flex: 1, backgroundColor: 'transparent' }}
                      containerStyle={{ backgroundColor: 'transparent' }}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text className="px-2 pb-1 text-sm font-medium text-strongGray dark:text-white">{footer}</Text>

      <ActionSheet visible={isGoalSheetOpen} actions={goalActions} onCancel={() => setIsGoalSheetOpen(false)} />
    </View>
  );
}
