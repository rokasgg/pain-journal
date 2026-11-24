import { useRef } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { buildCelebration } from '@/lib/checkinCelebration';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import type { Checkin, CheckinType } from '@/types/database.types';
import { sounds } from '@/utils/sounds';

// Same lookback (and so the same cached query) as useJourney, the oak and
// the History calendar.
const LOOKBACK_DAYS = 365;

// For screens that save a *new* check-in. Call `capture()` right before the
// save: the history is snapshotted then, because saving invalidates and
// refetches it, and a refetch landing first would make the new check-in look
// like it was already there. Then `celebrate()` after a successful save,
// before router.back().
export function useCheckinCelebration() {
  const { checkins, isLoading } = useCheckinHistory(LOOKBACK_DAYS);
  const snapshot = useRef<Pick<Checkin, 'checkin_date' | 'type'>[] | null>(null);

  return {
    capture: () => {
      snapshot.current = isLoading ? null : checkins.map(({ checkin_date, type }) => ({ checkin_date, type }));
      sounds.prepare();
    },
    celebrate: (type: CheckinType, checkinDate: string) => {
      useCelebrationStore.getState().show(buildCelebration({ type, checkinDate, checkinsBefore: snapshot.current }));
    },
  };
}
