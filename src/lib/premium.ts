import { format, parseISO, subDays } from 'date-fns';

// Free vs Premium. The rule: never paywall the daily habit (check-ins,
// flare-ups, the last 30 days of history), charge for the insight. See
// CLAUDE.md "Premium" for the full split.

/** Free users see this many days back in History (today included). */
export const FREE_HISTORY_DAYS = 30;

/** RevenueCat entitlement identifier. Must match the dashboard + edge functions. */
export const PREMIUM_ENTITLEMENT = 'pain_journaling_pro';

export const TRIAL_DAYS = 7;

/** What the user tried to open, so the paywall can lead with it. */
export type PremiumFeature =
  | 'ai'
  | 'history'
  | 'report'
  | 'physio'
  | 'findings'
  | 'routines'
  | 'wrap';

export const PREMIUM_FEATURES: readonly PremiumFeature[] = [
  'ai',
  'findings',
  'history',
  'report',
  'physio',
  'routines',
  'wrap',
];

export function isPremiumFeature(value: unknown): value is PremiumFeature {
  return typeof value === 'string' && (PREMIUM_FEATURES as readonly string[]).includes(value);
}

/** Oldest `yyyy-MM-dd` a free user can still open. */
export function freeHistoryStart(today: string): string {
  return format(subDays(parseISO(today), FREE_HISTORY_DAYS - 1), 'yyyy-MM-dd');
}

/** True when `date` (yyyy-MM-dd, local) is older than the free window. */
export function isHistoryDateLocked(date: string, today: string, isPremium: boolean): boolean {
  if (isPremium) return false;
  return date < freeHistoryStart(today);
}

interface EntitlementLike {
  expires_at: string | null;
}

/** A subscriptions row counts while its expiry is in the future. */
export function isActiveEntitlement(row: EntitlementLike | null | undefined, now: Date = new Date()): boolean {
  if (!row?.expires_at) return false;
  return parseISO(row.expires_at).getTime() > now.getTime();
}
