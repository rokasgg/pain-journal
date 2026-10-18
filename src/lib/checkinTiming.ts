// When each check-in is the "do this now" action. Pure so the Home glow, the
// first-day copy and tests all share one rule.

// Evening check-in is strictly time-gated — it stays locked until 4pm local
// time regardless of whether morning was completed, since it doesn't make
// sense to log "evening" activities before the evening has actually started.
export const EVENING_UNLOCK_HOUR = 16;

export type CheckinAction = 'morning' | 'evening';

// Before the evening unlock the moment for "how did you wake up" is now;
// from then on it's the evening. Already done → nothing to nudge.
export function getNowAction({
  hour,
  morningDone,
  eveningDone,
}: {
  hour: number;
  morningDone: boolean;
  eveningDone: boolean;
}): CheckinAction | null {
  if (hour < EVENING_UNLOCK_HOUR) return morningDone ? null : 'morning';
  return eveningDone ? null : 'evening';
}

// A brand-new user (nothing logged yet) opening the app in the evening
// shouldn't be nudged toward a morning check-in the moment has passed for —
// it's shown as optional (never blocked: logging how you woke up a few hours
// ago is still valid), and evening becomes the first thing to do.
export function isMorningOptionalToday({ hour, loggedDays }: { hour: number; loggedDays: number }): boolean {
  return loggedDays === 0 && hour >= EVENING_UNLOCK_HOUR;
}
