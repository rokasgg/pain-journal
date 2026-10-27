// Evening check-in answers that are chips in the UI but numbers/arrays in the
// DB, so the mapping lives in one tested place.

// "Kita fizinė veikla" — other physical activity. Stored in
// checkins.exercise_types as these English values (or custom text); "none"
// is did_exercises = false with an empty list.
export const EXERCISE_TYPE_OPTIONS = ['Walking', 'Swimming', 'Gym', 'Cycling'] as const;

export const EXERCISE_TYPE_LABEL_KEYS: Record<string, string> = {
  Walking: 'checkin.activities.walking',
  Swimming: 'checkin.activities.swimming',
  Gym: 'checkin.activities.gym',
  Cycling: 'checkin.activities.cycling',
};

// "Laikas prie ekrano" — checkins.screen_time_hours stays a number (the
// column and every reader expect hours), so each bucket saves a representative
// value, and an existing value maps back to its bucket.
export const SCREEN_TIME_BUCKETS = [
  { id: 'lt2', hours: 1, labelKey: 'checkin.screenBuckets.lt2' },
  { id: 'h2to4', hours: 3, labelKey: 'checkin.screenBuckets.h2to4' },
  { id: 'h4to6', hours: 5, labelKey: 'checkin.screenBuckets.h4to6' },
  { id: 'h6to8', hours: 7, labelKey: 'checkin.screenBuckets.h6to8' },
  { id: 'gte8', hours: 9, labelKey: 'checkin.screenBuckets.gte8' },
] as const;

export type ScreenTimeBucketId = (typeof SCREEN_TIME_BUCKETS)[number]['id'];

export function screenTimeBucketId(hours: number | null | undefined): ScreenTimeBucketId | null {
  if (hours == null) return null;
  if (hours < 2) return 'lt2';
  if (hours < 4) return 'h2to4';
  if (hours < 6) return 'h4to6';
  if (hours < 8) return 'h6to8';
  return 'gte8';
}
