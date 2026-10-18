import { useTodayCheckins } from '@/hooks/useCheckins';
import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';

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
