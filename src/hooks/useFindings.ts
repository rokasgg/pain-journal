import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useExperimentResults } from '@/hooks/useExperiments';
import { useFlareDetective } from '@/hooks/useFlareDetective';
import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';

import { isFinished } from '@/lib/experimentResult';
import { buildFindings } from '@/lib/findings';
import {
  morningVsEvening,
  progressSinceStart,
  sleepVsMorningPain,
  stepsVsNextMorningPain,
  stressVsEveningPain,
} from '@/lib/insightFindings';
import { purposeOf, wantsRecovery } from '@/lib/profileAnswers';
import { trainingReliefSummary, trainingVsRestNextDayPain } from '@/lib/trainingInsights';
import { useHealthStore } from '@/store/useHealthStore';
import { useToday } from '@/store/useTodayStore';

// A month is enough to learn something; a week (the old "this week" cards)
// wasn't. Matches the AI chat's default period.
export const FINDINGS_DAYS = 30;
const TRAINING_LOOKBACK_DAYS = 90;

// Insights → "What I've learned" (src/lib/findings.ts), from the same caches
// History, the flare-up detective and experiments already hold.
export function useFindings() {
  const { checkins, isLoading } = useCheckinHistory(365);
  const flare = useFlareDetective();
  const { experiments, resultFor, isLoading: experimentsLoading } = useExperimentResults();
  const { trainingEnabled } = useJourney();
  const { logs } = useExerciseLogHistory(TRAINING_LOOKBACK_DAYS);
  const healthConnected = useHealthStore((s) => s.enabled);
  const { profile } = useProfile();
  const today = useToday();

  // No manual memo: resultFor also depends on the daily experiment answers,
  // and the React Compiler memoizes this anyway.
  const result = buildFindings({
    flare: flare.result,
    experiments: experiments.map((experiment) => ({
      experiment,
      result: resultFor(experiment),
      finished: isFinished(experiment, today) || experiment.status === 'stopped',
    })),
    training: trainingEnabled
      ? {
          relief: trainingReliefSummary(logs),
          nextDay: trainingVsRestNextDayPain(logs, checkins, today),
        }
      : null,
    sleep: sleepVsMorningPain(checkins, today, FINDINGS_DAYS),
    steps: healthConnected ? stepsVsNextMorningPain(checkins, today) : null,
    slots: morningVsEvening(checkins, today, FINDINGS_DAYS),
    stress: stressVsEveningPain(checkins, today, FINDINGS_DAYS),
    // Over the 365-day history cache: "since you started" within the last year.
    progress: progressSinceStart(checkins),
    progressFirst: wantsRecovery(purposeOf(profile?.primary_goal)),
  });

  return {
    ...result,
    isLoading: isLoading || flare.isLoading || experimentsLoading,
  };
}
