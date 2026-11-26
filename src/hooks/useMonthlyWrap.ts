import { useMemo } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useFlareUps } from '@/hooks/useFlareUps';

import { buildMonthlyWrap, isWrapAvailable, recentCompletedMonths } from '@/lib/wrap';
import { useToday } from '@/store/useTodayStore';

// Same lookback as the History tab, so both share one cached query per table.
const WRAP_LOOKBACK_DAYS = 365;
const MAX_LISTED_WRAPS = 12;

export function useMonthlyWrap(month: string | undefined) {
  const { checkins, isLoading: checkinsLoading } = useCheckinHistory(WRAP_LOOKBACK_DAYS);
  const { flareUps, isLoading: flareUpsLoading } = useFlareUps(WRAP_LOOKBACK_DAYS);
  const { logs: exerciseLogs, isLoading: logsLoading } = useExerciseLogHistory(WRAP_LOOKBACK_DAYS);

  const slides = useMemo(
    () => (month ? buildMonthlyWrap({ month, checkins, flareUps, exerciseLogs }) : null),
    [month, checkins, flareUps, exerciseLogs],
  );

  return { slides, isLoading: checkinsLoading || flareUpsLoading || logsLoading };
}

// Completed months (newest first) with enough data for a Wrap.
export function useAvailableWraps(): string[] {
  const { checkins } = useCheckinHistory(WRAP_LOOKBACK_DAYS);
  const today = useToday();
  return useMemo(
    () => recentCompletedMonths(today, MAX_LISTED_WRAPS).filter((month) => isWrapAvailable(checkins, month)),
    [checkins, today],
  );
}
