import { format, parseISO, subDays } from 'date-fns';

import type { Checkin, CheckinType } from '@/types/database.types';

// "Yesterday: 6" hints under check-in sliders — display-only context from the
// previous same-type check-in. Never used to pre-fill a value: a pre-filled
// answer would silently save untouched fields (the bug the required-answer
// rules exist to prevent).

export interface PreviousCheckin {
  checkin: Checkin;
  isYesterday: boolean;
}

export function findPreviousCheckin(checkins: Checkin[], type: CheckinType, beforeDate: string): PreviousCheckin | null {
  let latest: Checkin | null = null;
  for (const checkin of checkins) {
    if (checkin.type !== type || checkin.checkin_date >= beforeDate) continue;
    if (!latest || checkin.checkin_date > latest.checkin_date) latest = checkin;
  }
  if (!latest) return null;
  const yesterday = format(subDays(parseISO(beforeDate), 1), 'yyyy-MM-dd');
  return { checkin: latest, isYesterday: latest.checkin_date === yesterday };
}

export type HintedCheckinField =
  | 'pain_level'
  | 'stiffness_level'
  | 'range_of_motion'
  | 'sleep_quality'
  | 'activity_level'
  | 'exercise_intensity';

export type CheckinSliderHints = Partial<Record<HintedCheckinField, string>>;

export const HINTED_FIELDS: HintedCheckinField[] = [
  'pain_level',
  'stiffness_level',
  'range_of_motion',
  'sleep_quality',
  'activity_level',
  'exercise_intensity',
];

// Previous values worth hinting. Pain 0 is skipped: "Yesterday: 0" next to a
// pain slider that only appears after answering "Yes, in pain" reads oddly.
export function previousHintValues(previous: Checkin): Partial<Record<HintedCheckinField, number>> {
  const values: Partial<Record<HintedCheckinField, number>> = {};
  for (const field of HINTED_FIELDS) {
    const value = previous[field];
    if (value == null) continue;
    if (field === 'pain_level' && value === 0) continue;
    values[field] = value;
  }
  return values;
}
