import { useMemo } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { useRoutineHistory } from '@/hooks/useRoutines';
import { todayLocalDate } from '@/lib/dates';
import {
  countLoggedDays,
  getJourneyState,
  isCareStepDue,
  resolveTrainingEnabled,
  type JourneyState,
  type MilestoneKey,
} from '@/lib/journey';

// Same lookback as History/Wrap, so this shares their cached query.
const JOURNEY_LOOKBACK_DAYS = 365;
const ALL_UNLOCKED = getJourneyState(Number.MAX_SAFE_INTEGER);

export interface Journey {
  state: JourneyState;
  isUnlocked: (key: MilestoneKey) => boolean;
  trainingEnabled: boolean;
  careStepDue: boolean;
  isLoading: boolean;
}

export function useJourney(): Journey {
  const { checkins, isLoading: checkinsLoading } = useCheckinHistory(JOURNEY_LOOKBACK_DAYS);
  const { profile, isLoading: profileLoading } = useProfile();
  const { routines, isLoading: routinesLoading } = useRoutineHistory();
  const isLoading = checkinsLoading || profileLoading || routinesLoading;

  return useMemo(() => {
    // While loading, report everything unlocked: an existing user should
    // never see locks flash on for a moment before their data arrives.
    const state = isLoading ? ALL_UNLOCKED : getJourneyState(countLoggedDays(checkins));
    return {
      state,
      isUnlocked: (key: MilestoneKey) => state.unlocked.has(key),
      trainingEnabled: resolveTrainingEnabled(profile, routines.length > 0),
      careStepDue: !isLoading && isCareStepDue(state, profile, todayLocalDate()),
      isLoading,
    };
  }, [isLoading, checkins, profile, routines.length]);
}
