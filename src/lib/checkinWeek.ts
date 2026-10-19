import { addDays, format, parseISO, startOfWeek } from 'date-fns';

import type { Checkin } from '@/types/database.types';

export interface CheckinWeekDay {
  date: string; // yyyy-MM-dd
  isToday: boolean;
  isFuture: boolean;
  morning: boolean;
  evening: boolean;
}

export interface CheckinWeek {
  days: CheckinWeekDay[]; // Monday → Sunday
  logged: number; // check-ins logged this week
  total: number; // 2 per day = 14
}

// "This week" on Home: which of this week's 14 possible check-ins (morning +
// evening, Monday-start) were logged. Pure — `today` is injected.
export function buildCheckinWeek(checkins: Pick<Checkin, 'checkin_date' | 'type'>[], today: string): CheckinWeek {
  const logged = new Set(checkins.map((checkin) => `${checkin.checkin_date}|${checkin.type}`));
  const monday = startOfWeek(parseISO(today), { weekStartsOn: 1 });

  const days: CheckinWeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = format(addDays(monday, index), 'yyyy-MM-dd');
    return {
      date,
      isToday: date === today,
      isFuture: date > today,
      morning: logged.has(`${date}|morning`),
      evening: logged.has(`${date}|evening`),
    };
  });

  const count = days.reduce((sum, day) => sum + Number(day.morning) + Number(day.evening), 0);
  return { days, logged: count, total: days.length * 2 };
}
