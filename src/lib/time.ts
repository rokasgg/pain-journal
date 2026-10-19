import { format } from 'date-fns';

// "HH:mm" helpers for reminder times. Zero-padded 24h strings compare
// correctly as plain strings, which keeps clamping trivial.

export function timeToDate(time: string, base = new Date()): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(base);
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
}

export function dateToTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function hourToTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function clampTime(time: string, minimum?: string, maximum?: string): string {
  if (minimum && time < minimum) return minimum;
  if (maximum && time > maximum) return maximum;
  return time;
}
