import { format, parseISO, subDays } from 'date-fns';

import type { InjuryOnsetPeriod, PrimaryGoal } from '@/types/database.types';

// What the user wants from the app, from onboarding step 0. Older answers
// still map: identify_triggers → understand, track_progress → recovery.
export type Purpose = 'recovery' | 'understand' | 'both';

export function purposeOf(goal: PrimaryGoal | null | undefined): Purpose | null {
  switch (goal) {
    case 'track_recovery':
    case 'track_progress':
      return 'recovery';
    case 'understand_pain':
    case 'identify_triggers':
      return 'understand';
    case 'both':
      return 'both';
    default:
      return null;
  }
}

export function wantsRecovery(purpose: Purpose | null): boolean {
  return purpose === 'recovery' || purpose === 'both';
}

export type OnboardingStepKey =
  'purpose' | 'where' | 'start' | 'diagnosis' | 'work' | 'stress' | 'hunches' | 'prefs' | 'ai';

// The lifestyle steps never block a new user: each has "Ask me later", and
// Settings → About me can collect them any time.
export const SKIPPABLE_STEPS: ReadonlySet<OnboardingStepKey> = new Set(['work', 'stress', 'hunches']);

// Every path asks the same questions, only the order changes, so the data is
// the same for everyone. Recovery asks about the diagnosis early; understand
// asks for hunches early and the diagnosis later.
export function onboardingSteps(purpose: Purpose | null): OnboardingStepKey[] {
  if (purpose === 'understand') {
    return ['purpose', 'where', 'start', 'hunches', 'work', 'stress', 'diagnosis', 'prefs', 'ai'];
  }
  return ['purpose', 'where', 'diagnosis', 'start', 'work', 'stress', 'hunches', 'prefs', 'ai'];
}

const PERIOD_DAYS: Partial<Record<InjuryOnsetPeriod, number>> = {
  this_week: 3,
  month_ago: 30,
  months_ago: 90,
  year_plus: 365,
};

// A rough period ("a month ago") as an approximate date, saved to
// injury_started_on with injury_started_approx: true. "unknown" → null.
// Same mapping as supabase_profile_lifestyle_migration.sql's backfill.
export function approxStartDate(period: InjuryOnsetPeriod, today: string): string | null {
  const days = PERIOD_DAYS[period];
  return days === undefined ? null : format(subDays(parseISO(today), days), 'yyyy-MM-dd');
}

// The lines on onboarding's "reading your answers" screen, built from what
// was actually answered, so it says something true about this user. Plain
// descriptions only: nothing here is AI.
export type AnalysisStep =
  'reading' | 'diagnosis' | 'areas' | 'usualDay' | 'hunches' | 'checkinsQuick' | 'checkinsDetailed' | 'oak';

export interface AnalysisInput {
  diagnosed: boolean;
  painAreas: number;
  answeredUsualDay: boolean; // work or stress answered (not skipped)
  hunches: number; // suspected triggers, excluding "I don't know"
  quickCheckins: boolean;
}

export function analysisSteps(input: AnalysisInput): AnalysisStep[] {
  const steps: AnalysisStep[] = ['reading'];
  if (input.diagnosed) steps.push('diagnosis');
  else if (input.painAreas > 0) steps.push('areas');
  if (input.answeredUsualDay) steps.push('usualDay');
  if (input.hunches > 0) steps.push('hunches');
  steps.push(input.quickCheckins ? 'checkinsQuick' : 'checkinsDetailed', 'oak');
  return steps;
}
