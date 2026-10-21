import { useCheckinHistory } from '@/hooks/useCheckins';
import { countLoggedDays } from '@/lib/journey';
import { getOakStage, type OakStage } from '@/lib/oak';

export interface OakStageState {
  // null while loading, so callers don't mount the seed and then "grow" it
  // on every launch when the real count arrives.
  stage: OakStage | null;
  loggedDays: number;
}

// The oak grows with logged days (distinct check-in dates, backfills
// included), the same count that drives the journey unlocks. Shares
// useJourney's 365-day query, so it's already cached.
export function useOakStage(): OakStageState {
  const { checkins, isLoading } = useCheckinHistory(365);
  const loggedDays = countLoggedDays(checkins);
  return { stage: isLoading ? null : getOakStage(loggedDays), loggedDays };
}
