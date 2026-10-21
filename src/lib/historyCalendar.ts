export type PainTint = 'none' | 'free' | 'low' | 'mid' | 'high';

// Circle tint for a day's average pain (from its logged check-ins).
// 0 → free, >0 and <4 → low, 4 to <7 → mid, ≥7 → high, no data → none.
export function painTint(avgPain: number | null | undefined): PainTint {
  if (avgPain == null) return 'none';
  if (avgPain === 0) return 'free';
  if (avgPain < 4) return 'low';
  if (avgPain < 7) return 'mid';
  return 'high';
}

// Earliest checkin_date in the list (yyyy-MM-dd sorts lexically), or null.
// Calendar dots only show from this day on, so days before the user started
// don't read as "missed".
export function firstCheckinDate(checkins: readonly { checkin_date: string }[]): string | null {
  let first: string | null = null;
  for (const { checkin_date } of checkins) {
    if (first === null || checkin_date < first) first = checkin_date;
  }
  return first;
}

// Mean of a day's pain levels, or null with no check-ins.
export function dayAveragePain(checkins: readonly { pain_level: number }[]): number | null {
  if (checkins.length === 0) return null;
  return checkins.reduce((sum, c) => sum + c.pain_level, 0) / checkins.length;
}
