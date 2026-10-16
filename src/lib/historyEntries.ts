import { type DayMarker } from '@/components/history/WeekCalendar';
import { toLocalDate } from '@/lib/dates';
import type { Checkin, FlareUp } from '@/types/database.types';

export function buildCalendarMarkers(checkins: Checkin[], flareUps: FlareUp[]): Record<string, DayMarker> {
  const markers: Record<string, DayMarker> = {};
  const painByDate = new Map<string, number[]>();

  for (const checkin of checkins) {
    const marker = (markers[checkin.checkin_date] ??= {
      hasMorning: false,
      hasEvening: false,
      hasFlareUp: false,
      avgPain: null,
    });
    if (checkin.type === 'morning') marker.hasMorning = true;
    else marker.hasEvening = true;

    const levels = painByDate.get(checkin.checkin_date) ?? [];
    levels.push(checkin.pain_level);
    painByDate.set(checkin.checkin_date, levels);
  }

  for (const [date, levels] of painByDate) {
    markers[date].avgPain = levels.reduce((sum, level) => sum + level, 0) / levels.length;
  }

  for (const flareUp of flareUps) {
    // occurred_at is a timestamptz — slicing its ISO string gives the UTC
    // day, which puts late-night flare-ups on the previous local day.
    const dateStr = toLocalDate(flareUp.occurred_at);
    const marker = (markers[dateStr] ??= {
      hasMorning: false,
      hasEvening: false,
      hasFlareUp: false,
      avgPain: null,
    });
    marker.hasFlareUp = true;
  }

  return markers;
}
