import { type DayMarker } from '@/components/history/WeekCalendar';
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
    const dateStr = flareUp.occurred_at.slice(0, 10);
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
