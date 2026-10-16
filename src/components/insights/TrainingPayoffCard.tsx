import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useRoutineHistory } from '@/hooks/useRoutines';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import {
  exerciseProgress,
  trainingReliefSummary,
  trainingVsRestNextDayPain,
} from '@/lib/trainingInsights';

const LOOKBACK_DAYS = 42;
// Below this, next-day pain after training vs rest reads as noise — say so
// honestly rather than implying training does (or doesn't) help.
const MIN_MEANINGFUL_GAP = 0.3;

function one(value: number): string {
  return value.toFixed(1);
}

function Row({ icon, label, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; children: string }) {
  return (
    <View className="flex-row gap-3">
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">{label}</Text>
        <Text className="text-sm text-black dark:text-white">{children}</Text>
      </View>
    </View>
  );
}

// "Is it working?" — the payoff for training: pain before → after, next-day
// pain after training vs rest days, and exercises getting easier. Plain
// arithmetic over logged data (src/lib/trainingInsights.ts), no AI. Always
// renders (empty-state hint when there's nothing yet), same rule as
// TodaysRoutineCard — a card that vanishes reads as "this doesn't exist".
export function TrainingPayoffCard() {
  const { t } = useTranslation();
  const { logs } = useExerciseLogHistory(LOOKBACK_DAYS);
  const { checkins } = useCheckinHistory(LOOKBACK_DAYS);
  const { routines } = useRoutineHistory();

  const { relief, nextDay, easier } = useMemo(() => {
    const today = todayLocalDate();
    return {
      relief: trainingReliefSummary(logs),
      nextDay: trainingVsRestNextDayPain(logs, checkins, today),
      easier: exerciseProgress(logs, routines, today, LOOKBACK_DAYS),
    };
  }, [logs, checkins, routines]);

  const hasAnything = relief || nextDay || easier.length > 0;

  return (
    <View className="gap-4 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-semibold text-black dark:text-white">{t('training.payoffTitle')}</Text>

      {!hasAnything && <Text className="text-sm text-gray-500 dark:text-gray">{t('training.payoffEmpty')}</Text>}

      {relief && (
        <Row icon="trending-down" label={t('training.reliefLabel')}>
          {relief.avgDrop > 0
            ? t('training.reliefValue', { drop: one(relief.avgDrop), count: relief.sessions })
            : t('training.reliefNoDrop', { count: relief.sessions })}
        </Row>
      )}

      {nextDay && (
        <Row icon="sunny-outline" label={t('training.nextDayLabel')}>
          {Math.abs(nextDay.afterRest - nextDay.afterTraining) < MIN_MEANINGFUL_GAP
            ? t('training.nextDayNoDifference')
            : t('training.nextDayValue', { training: one(nextDay.afterTraining), rest: one(nextDay.afterRest) })}
        </Row>
      )}

      {easier.length > 0 && (
        <Row icon="barbell-outline" label={t('training.easierLabel')}>
          {easier.map((item) => `${item.name} ${one(item.from)} → ${one(item.to)}`).join('\n')}
        </Row>
      )}
    </View>
  );
}
