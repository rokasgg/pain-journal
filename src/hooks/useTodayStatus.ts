import { useTodayCheckins } from '@/hooks/useCheckins';
import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import { useTodayStore } from '@/store/useTodayStore';

export function useTodayStatus() {
  const { checkins, isLoading } = useTodayCheckins();

  const morningDone = checkins.some((c) => c.type === 'morning');
  const eveningDone = checkins.some((c) => c.type === 'evening');
  // `clock` is re-read on every resume, at midnight and at the evening
  // unlock (useAppLifecycle), so this flips without restarting the app.
  const clock = useTodayStore((s) => s.clock);
  const eveningUnlocked = new Date(clock).getHours() >= EVENING_UNLOCK_HOUR;

  return {
    morningDone,
    eveningDone,
    eveningUnlocked,
    isLoading,
  };
}
