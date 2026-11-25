import type { Checkin, CheckinType } from '@/types/database.types';

import { countLoggedDays, getJourneyState, type MilestoneKey } from './journey';
import { getOakStage, type OakStage } from './oak';

// What a newly saved check-in earned, for the "check-in complete" screen
// (WateringCelebrationHost). Pure, so the numbers shown are tested. It only
// ever celebrates showing up: nothing here compares pain or counts misses.

// Round numbers of logged days that get the bigger celebration, after the
// journey unlocks (3 / 7 / 14) are behind the user.
export const ANNIVERSARY_DAYS = [30, 60, 100, 200, 365] as const;

// Milestones announced on this screen. The care step is a Home card of its
// own, not a feature, so it isn't announced here (same as JourneyCard).
export type CelebratedUnlock = Exclude<MilestoneKey, 'careStep'>;

export interface CheckinCelebration {
  type: CheckinType;
  // Both of that day's check-ins are now logged.
  dayComplete: boolean;
  // Null when the history wasn't loaded at save time: the screen then shows
  // only the oak and the headline, never a wrong number.
  progress: CelebrationProgress | null;
}

export interface CelebrationProgress {
  // The date wasn't logged before (an evening after that day's morning isn't).
  isNewDay: boolean;
  // The user's very first logged day: the screen says what comes next and
  // offers reminders, since nothing else in the app has done that yet.
  isFirstEver: boolean;
  daysBefore: number;
  daysAfter: number;
  stageBefore: OakStage;
  stageAfter: OakStage;
  newlyUnlocked: CelebratedUnlock[];
  anniversary: number | null;
  // The next unlock still ahead, or null once everything is unlocked.
  next: { key: CelebratedUnlock; days: number; daysRemaining: number } | null;
  tier: 'normal' | 'milestone';
}

export interface BuildCelebrationInput {
  type: CheckinType;
  checkinDate: string;
  checkinsBefore: Pick<Checkin, 'checkin_date' | 'type'>[] | null;
}

export function buildCelebration({ type, checkinDate, checkinsBefore }: BuildCelebrationInput): CheckinCelebration {
  if (!checkinsBefore) return { type, dayComplete: false, progress: null };

  const sameDay = checkinsBefore.filter((checkin) => checkin.checkin_date === checkinDate);
  const otherType: CheckinType = type === 'morning' ? 'evening' : 'morning';
  const dayComplete = sameDay.some((checkin) => checkin.type === otherType);

  const isNewDay = sameDay.length === 0;
  const daysBefore = countLoggedDays(checkinsBefore);
  const daysAfter = isNewDay ? daysBefore + 1 : daysBefore;

  const before = getJourneyState(daysBefore);
  const after = getJourneyState(daysAfter);
  const newlyUnlocked = [...after.unlocked].filter(
    (key): key is CelebratedUnlock => key !== 'careStep' && !before.unlocked.has(key),
  );

  // The care step shares its day count with Insights, which comes first in
  // JOURNEY_MILESTONES, so `next` is never the care step in practice.
  const next = after.next && after.next.key !== 'careStep' ? { ...after.next, key: after.next.key } : null;

  const stageBefore = getOakStage(daysBefore);
  const stageAfter = getOakStage(daysAfter);
  const anniversary = isNewDay && (ANNIVERSARY_DAYS as readonly number[]).includes(daysAfter) ? daysAfter : null;

  const tier = stageAfter > stageBefore || newlyUnlocked.length > 0 || anniversary !== null ? 'milestone' : 'normal';

  return {
    type,
    dayComplete,
    progress: {
      isNewDay,
      isFirstEver: isNewDay && daysBefore === 0,
      daysBefore,
      daysAfter,
      stageBefore,
      stageAfter,
      newlyUnlocked,
      anniversary,
      next,
      tier,
    },
  };
}

// Dev-only previews (the hidden long-press on Home's healing badge), so the
// screen can be checked without logging real check-ins: alternates between a
// normal day (day 5) and a milestone (day 3: History unlocks, the oak grows).
let previewCount = 0;
export function previewCelebration(today: string): CheckinCelebration {
  previewCount += 1;
  const pastDays = previewCount % 2 === 1 ? 4 : 2;
  const checkinsBefore = Array.from({ length: pastDays }, (_, index) => ({
    checkin_date: `2000-01-${String(index + 1).padStart(2, '0')}`,
    type: 'morning' as const,
  }));
  return buildCelebration({ type: 'evening', checkinDate: today, checkinsBefore });
}
