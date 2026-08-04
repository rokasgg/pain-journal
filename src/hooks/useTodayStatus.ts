import { useTodayCheckins } from '@/hooks/useCheckins';

// Evening check-in is strictly time-gated — it stays locked until 4pm local
// time regardless of whether morning was completed, since it doesn't make
// sense to log "evening" activities before the evening has actually started.
const EVENING_UNLOCK_HOUR = 16;

export function useTodayStatus() {
  const { checkins, isLoading } = useTodayCheckins();

  const morningDone = checkins.some((c) => c.type === 'morning');
  const eveningDone = checkins.some((c) => c.type === 'evening');
  const eveningUnlocked = new Date().getHours() >= EVENING_UNLOCK_HOUR;

  return {
    morningDone,
    eveningDone,
    eveningUnlocked,
    isLoading,
  };
}
