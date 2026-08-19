import { format, parseISO, subDays } from 'date-fns';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { todayLocalDate } from '@/lib/dates';
import { getFlowerHealthStage, type FlowerHealthStage } from '@/constants/flowerHealthStages';

const HEALTH_WINDOW_DAYS = 14;
const HEALTH_MIN = 0;
const HEALTH_MAX = 10;
const HEALTH_BASELINE = 5;

export interface FlowerHealth {
  score: number;
  stage: FlowerHealthStage;
  isLoading: boolean;
}

export function useFlowerHealth(): FlowerHealth {
  const { checkins, isLoading } = useCheckinHistory(30);

  const countsByDate = new Map<string, number>();
  for (const checkin of checkins) {
    countsByDate.set(checkin.checkin_date, (countsByDate.get(checkin.checkin_date) ?? 0) + 1);
  }

  const today = todayLocalDate();
  let score = HEALTH_BASELINE;

  // Walk the last HEALTH_WINDOW_DAYS days ending yesterday, oldest first.
  // Today is deliberately excluded — it isn't "final" until the evening
  // check-in has had a chance to unlock, so scoring it early would show an
  // unfair wilt mid-day. Clamping after every day (not just at the end) makes
  // the result depend only on roughly the last ~10 days, regardless of the
  // starting baseline — a stable, self-correcting rolling score.
  for (let daysAgo = HEALTH_WINDOW_DAYS; daysAgo >= 1; daysAgo--) {
    const date = format(subDays(parseISO(today), daysAgo), 'yyyy-MM-dd');
    const count = countsByDate.get(date) ?? 0;
    const delta = count >= 2 ? 1 : count === 1 ? 0 : -1;
    score = Math.min(HEALTH_MAX, Math.max(HEALTH_MIN, score + delta));
  }

  return { score, stage: getFlowerHealthStage(score), isLoading };
}
