import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { Checkin, Profile } from '@/types/database.types';

// New-user journey: features unlock by *logged days* (distinct check-in
// dates), not calendar time — the reward is tied to actually showing up.
// The app never suggests a diagnosis; the care step points to a professional.

export type MilestoneKey = 'history' | 'insights' | 'careStep' | 'reports';

export const JOURNEY_MILESTONES: { key: MilestoneKey; days: number }[] = [
  { key: 'history', days: 3 },
  { key: 'insights', days: 7 },
  { key: 'careStep', days: 7 },
  { key: 'reports', days: 14 },
];

export const CARE_STEP_REASK_DAYS = 14;

export interface JourneyState {
  loggedDays: number;
  unlocked: Set<MilestoneKey>;
  // The next milestone still ahead, or null once everything is unlocked.
  next: { key: MilestoneKey; days: number; daysRemaining: number } | null;
}

// Morning + evening on one day count once; backfilled days count too.
export function countLoggedDays(checkins: Pick<Checkin, 'checkin_date'>[]): number {
  return new Set(checkins.map((checkin) => checkin.checkin_date)).size;
}

export function getJourneyState(loggedDays: number): JourneyState {
  const unlocked = new Set<MilestoneKey>();
  let next: JourneyState['next'] = null;
  for (const milestone of JOURNEY_MILESTONES) {
    if (loggedDays >= milestone.days) unlocked.add(milestone.key);
    else if (!next) next = { ...milestone, daysRemaining: milestone.days - loggedDays };
  }
  return { loggedDays, unlocked, next };
}

// An explicit choice (care step or Settings switch) wins. Undecided users keep
// training features if they already use them (have routines) or asked for
// them in onboarding — so existing users never lose anything they rely on.
export function resolveTrainingEnabled(
  profile: Pick<Profile, 'training_enabled' | 'primary_goal'> | null | undefined,
  hasRoutines: boolean,
): boolean {
  if (profile?.training_enabled != null) return profile.training_enabled;
  return hasRoutines || profile?.primary_goal === 'track_exercises';
}

// Asked once Insights unlocks; "not yet" is re-asked after 14 days.
export function isCareStepDue(
  state: JourneyState,
  profile: Pick<Profile, 'care_status' | 'care_status_answered_at'> | null | undefined,
  today: string,
): boolean {
  if (!state.unlocked.has('careStep')) return false;
  if (!profile?.care_status) return true;
  if (profile.care_status !== 'not_yet' || !profile.care_status_answered_at) return false;
  return differenceInCalendarDays(parseISO(today), parseISO(profile.care_status_answered_at)) >= CARE_STEP_REASK_DAYS;
}
