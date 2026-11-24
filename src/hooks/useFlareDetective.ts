import { useMemo } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useFlareUps } from '@/hooks/useFlareUps';
import { useJourney } from '@/hooks/useJourney';

import {
  analyzeFlareUps,
  buildBaseline,
  DETECTIVE_WINDOW_DAYS,
  flareLeadUp,
  type DetectiveInput,
  type DetectiveFlareUp,
  type FlareLeadUp,
} from '@/lib/flareDetective';
import { trainedDaySet } from '@/lib/trainingInsights';
import { useToday } from '@/store/useTodayStore';

// Flare-up detective over the same 365-day caches History and Wrap use, plus
// training sessions when training is tracked (otherwise "trained the day
// before" is left out instead of read as "never trains").
export function useFlareDetective() {
  const { checkins, isLoading: checkinsLoading } = useCheckinHistory(365);
  const { flareUps, isLoading: flaresLoading } = useFlareUps(365);
  const { trainingEnabled } = useJourney();
  const { logs } = useExerciseLogHistory(DETECTIVE_WINDOW_DAYS);
  const today = useToday();

  return useMemo(() => {
    const trainedDays = trainingEnabled && logs.length > 0 ? trainedDaySet(logs) : null;
    const input: DetectiveInput = { checkins, flareUps, trainedDays, today };
    const baseline = buildBaseline(input);
    return {
      isLoading: checkinsLoading || flaresLoading,
      result: analyzeFlareUps(input),
      leadUpFor: (flare: DetectiveFlareUp): FlareLeadUp => flareLeadUp(flare, checkins, baseline, trainedDays),
    };
  }, [checkins, flareUps, trainingEnabled, logs, today, checkinsLoading, flaresLoading]);
}
