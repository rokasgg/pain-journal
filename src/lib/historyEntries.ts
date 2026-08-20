import { type DayMarker } from '@/components/history/WeekCalendar';
import { type HistoryEntry } from '@/components/history/EntryListItem';
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

export function buildHistoryEntries(checkins: Checkin[], flareUps: FlareUp[]): HistoryEntry[] {
  const checkinEntries: HistoryEntry[] = checkins.map((data) => ({ kind: 'checkin', data }));
  const flareUpEntries: HistoryEntry[] = flareUps.map((data) => ({ kind: 'flareUp', data }));

  return [...checkinEntries, ...flareUpEntries].sort((a, b) => {
    const aDate = a.kind === 'checkin' ? a.data.checkin_date : a.data.occurred_at;
    const bDate = b.kind === 'checkin' ? b.data.checkin_date : b.data.occurred_at;
    return bDate.localeCompare(aDate);
  });
}
