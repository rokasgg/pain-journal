import type { ExperimentResult } from '@/lib/experimentResult';
import type { FlareDetective, FlarePattern } from '@/lib/flareDetective';
import type {
  MorningVsEvening,
  ProgressSinceStart,
  SleepVsMorningPain,
  StepsVsNextMorningPain,
  StressVsEveningPain,
} from '@/lib/insightFindings';
import type { NextDayComparison, ReliefSummary } from '@/lib/trainingInsights';
import type { Experiment } from '@/types/database.types';

// Insights → "What I've learned": every finding the app can make, as one
// list, strongest kind first. Only real findings make the list. Results that
// are "about the same" are dropped, and ones still waiting for data only add
// to `pending`, so the page never fills up with empty states. Each source
// keeps its own logic and thresholds; this file only picks and orders.

// Below this, a training difference reads as noise (same as the old card).
const MIN_TRAINING_GAP = 0.3;

export type Finding =
  | {
      kind: 'progress';
      direction: 'better' | 'worse';
      start: number;
      now: number;
      windowDays: 7 | 14;
      loggedDays: number;
    }
  | { kind: 'flare'; pattern: FlarePattern; morePatterns: number; flares: number }
  | {
      kind: 'experiment';
      experiment: Pick<Experiment, 'id' | 'template' | 'custom_title'>;
      direction: 'lower' | 'higher';
      during: number;
      before: number;
    }
  | { kind: 'trainingRelief'; avgDrop: number; sessions: number }
  | { kind: 'trainingNextDay'; comparison: NextDayComparison }
  | { kind: 'sleep'; direction: 'higher' | 'lower'; entries: number }
  | { kind: 'stress'; direction: 'higher' | 'lower'; stressful: number; calm: number; entries: number }
  | { kind: 'steps'; direction: 'higher' | 'lower'; threshold: number; entries: number }
  | { kind: 'slots'; direction: 'morningHigher' | 'eveningHigher'; diff: number; entries: number };

export interface FindingsInput {
  flare: FlareDetective;
  // Newest first. Only finished ones are considered.
  experiments: {
    experiment: Pick<Experiment, 'id' | 'template' | 'custom_title'>;
    result: ExperimentResult;
    finished: boolean;
  }[];
  // null when training isn't tracked.
  training: { relief: ReliefSummary | null; nextDay: NextDayComparison | null } | null;
  sleep: SleepVsMorningPain;
  // null when Apple Health isn't connected.
  steps: StepsVsNextMorningPain | null;
  slots: MorningVsEvening;
  stress: StressVsEveningPain;
  progress: ProgressSinceStart;
  // The user is here to track their recovery (src/lib/profileAnswers.ts):
  // progress since the start goes first instead of after the training ones.
  progressFirst: boolean;
}

export interface Findings {
  findings: Finding[];
  // Sources that could produce a finding but don't have enough data yet.
  pending: number;
}

export function buildFindings({
  flare,
  experiments,
  training,
  sleep,
  steps,
  slots,
  stress,
  progress,
  progressFirst,
}: FindingsInput): Findings {
  const findings: Finding[] = [];
  let pending = 0;

  // "Steady" is dropped like any "about the same" result.
  const progressFinding: Finding | null =
    progress.status === 'ready' && progress.direction !== 'steady'
      ? {
          kind: 'progress',
          direction: progress.direction,
          start: progress.pain.start,
          now: progress.pain.now,
          windowDays: progress.windowDays,
          loggedDays: progress.loggedDays,
        }
      : null;
  if (progress.status !== 'ready') pending += 1;
  if (progressFirst && progressFinding) findings.push(progressFinding);

  // No flare-ups at all isn't "waiting": there's nothing to learn, which is good.
  if (flare.status === 'notEnough') pending += 1;
  if (flare.status === 'ready' && flare.patterns.length > 0) {
    findings.push({
      kind: 'flare',
      pattern: flare.patterns[0],
      morePatterns: flare.patterns.length - 1,
      flares: flare.flares,
    });
  }

  for (const { experiment, result, finished } of experiments) {
    if (!finished || result.status !== 'ready' || result.pain.direction === 'similar') continue;
    findings.push({
      kind: 'experiment',
      experiment,
      direction: result.pain.direction,
      during: result.pain.during,
      before: result.pain.before,
    });
  }

  if (training) {
    if (!training.relief) pending += 1;
    else if (Math.abs(training.relief.avgDrop) >= MIN_TRAINING_GAP) {
      findings.push({ kind: 'trainingRelief', avgDrop: training.relief.avgDrop, sessions: training.relief.sessions });
    }
    if (!training.nextDay) pending += 1;
    else if (Math.abs(training.nextDay.afterRest - training.nextDay.afterTraining) >= MIN_TRAINING_GAP) {
      findings.push({ kind: 'trainingNextDay', comparison: training.nextDay });
    }
  }

  if (!progressFirst && progressFinding) findings.push(progressFinding);

  if (sleep.status === 'ready') {
    if (sleep.direction !== 'similar')
      findings.push({ kind: 'sleep', direction: sleep.direction, entries: sleep.entries });
  } else {
    // 'oneSided' (every night alike) is waiting for a different night too.
    pending += 1;
  }

  if (stress.status === 'ready') {
    if (stress.direction !== 'similar') {
      findings.push({
        kind: 'stress',
        direction: stress.direction,
        stressful: stress.stressful,
        calm: stress.calm,
        entries: stress.entries,
      });
    }
  } else {
    pending += 1;
  }

  if (steps) {
    if (steps.status === 'ready') {
      if (steps.direction !== 'similar') {
        findings.push({
          kind: 'steps',
          direction: steps.direction,
          threshold: steps.threshold,
          entries: steps.entries,
        });
      }
    } else {
      pending += 1;
    }
  }

  if (slots.status === 'ready') {
    if (slots.direction !== 'similar') {
      findings.push({ kind: 'slots', direction: slots.direction, diff: slots.diff, entries: slots.entries });
    }
  } else {
    pending += 1;
  }

  return { findings, pending };
}
