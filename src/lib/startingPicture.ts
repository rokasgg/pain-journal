import { wantsRecovery, type Purpose } from '@/lib/profileAnswers';
import type { LifeStress, WorkHours, WorkType, WorstTimeOfDay } from '@/types/database.types';

// The "Your starting picture" screen after onboarding (and at the bottom of
// Settings → About me). Rules only, no AI: what the app will keep an eye on,
// picked from the user's own answers. Every card is a hunch to check against
// their check-ins, never a conclusion.

export type PictureCardId =
  | 'startingPoint' // recovery: we'll compare your next weeks with your first
  | 'learnAsYouLog' // nothing to watch yet: we'll learn as you log
  | 'sitting'
  | 'stress'
  | 'screens'
  | 'sleep'
  | 'onFeet'
  | 'worstTime';

export interface PictureCard {
  id: PictureCardId;
  // An experiment template that fits (src/constants/experiments.ts), named in
  // the card's text only; nothing starts automatically.
  experiment?: string;
  worstTime?: WorstTimeOfDay;
}

export interface StartingPictureInput {
  purpose: Purpose | null;
  workType: WorkType | null | undefined;
  workHours: WorkHours | null | undefined;
  lifeStress: LifeStress | null | undefined;
  suspectedTriggers: string[] | undefined;
  worstTimeOfDay: WorstTimeOfDay | null | undefined;
}

export const MAX_PICTURE_CARDS = 3;
const LONG_DAY: ReadonlySet<WorkHours> = new Set(['6_8', '8_plus']);

export function buildStartingPicture(input: StartingPictureInput): PictureCard[] {
  const hunches = new Set(input.suspectedTriggers ?? []);
  const longDay = !!input.workHours && LONG_DAY.has(input.workHours);
  const cards: PictureCard[] = [];

  if (wantsRecovery(input.purpose)) cards.push({ id: 'startingPoint' });

  // Fixed priority order: the ones with something concrete to try come first.
  if ((input.workType === 'sitting' && longDay) || hunches.has('sitting')) {
    cards.push({ id: 'sitting', experiment: 'deskBreaks' });
  }
  if (input.lifeStress === 'high' || hunches.has('stress')) cards.push({ id: 'stress' });
  if (hunches.has('screens')) cards.push({ id: 'screens', experiment: 'noScreensLate' });
  if (hunches.has('poor_sleep')) cards.push({ id: 'sleep', experiment: 'bedBefore23' });
  if ((input.workType === 'standing' && longDay) || input.workType === 'physical' || hunches.has('standing')) {
    cards.push({ id: 'onFeet' });
  }
  if (input.worstTimeOfDay && input.worstTimeOfDay !== 'no_pattern') {
    cards.push({ id: 'worstTime', worstTime: input.worstTimeOfDay });
  }

  if (cards.length === 0) return [{ id: 'learnAsYouLog' }];
  return cards.slice(0, MAX_PICTURE_CARDS);
}

// True when any of the day-to-day questions is still unanswered (skipped with
// "Ask me later", or an account from before they existed).
export function hasUnansweredAboutMe(profile: {
  work_type?: WorkType | null;
  life_stress?: LifeStress | null;
  suspected_triggers?: string[];
  worst_time_of_day?: WorstTimeOfDay | null;
}): boolean {
  const noHunches = (profile.suspected_triggers ?? []).length === 0 && !profile.worst_time_of_day;
  return !profile.work_type || !profile.life_stress || noHunches;
}
