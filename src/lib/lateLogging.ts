import { differenceInCalendarDays, parseISO } from 'date-fns';

import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import type { CheckinType } from '@/types/database.types';

// A missed check-in can be added for yesterday and the day before
// (the day before yesterday until 23:59 today). Nothing older.
export const LATE_LOG_MAX_DAYS_BACK = 2;

export type SlotStatus =
  | 'logged'
  // Today, missing, open now — the normal (on-time) check-in flow.
  | 'canLogNow'
  // Yesterday / the day before, missing — "Log it later".
  | 'canLogLate'
  // Today's evening before EVENING_UNLOCK_HOUR.
  | 'opensLater'
  // Missing and too old to add.
  | 'missed'
  | 'future';

export interface SlotStatusInput {
  date: string; // local yyyy-MM-dd
  type: CheckinType;
  today: string; // local yyyy-MM-dd
  hour: number; // current local hour, 0–23
  logged: boolean;
}

export function getSlotStatus({ date, type, today, hour, logged }: SlotStatusInput): SlotStatus {
  const daysBack = differenceInCalendarDays(parseISO(today), parseISO(date));
  if (daysBack < 0) return 'future';
  if (logged) return 'logged';
  if (daysBack === 0) return type === 'evening' && hour < EVENING_UNLOCK_HOUR ? 'opensLater' : 'canLogNow';
  return daysBack <= LATE_LOG_MAX_DAYS_BACK ? 'canLogLate' : 'missed';
}

// Last day a late entry for `date` can still be added, relative to today:
// yesterday's → until tomorrow 23:59, the day before's → until today 23:59.
export function lateLogDeadline(date: string, today: string): 'today' | 'tomorrow' | null {
  const daysBack = differenceInCalendarDays(parseISO(today), parseISO(date));
  if (daysBack === 1) return 'tomorrow';
  if (daysBack === 2) return 'today';
  return null;
}

export function canLogLate(date: string, today: string): boolean {
  return lateLogDeadline(date, today) !== null;
}
