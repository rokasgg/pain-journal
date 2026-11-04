import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';

import { readDayActivity, type HealthActivity } from '@/lib/health/healthkit';
import { useHealthStore } from '@/store/useHealthStore';

// A day's steps and workouts from Apple Health, for the evening check-in.
// null when Health isn't connected or unavailable.
export function useHealthActivity(date: string): HealthActivity | null {
  const enabled = useHealthStore((s) => s.enabled);
  const { data } = useQuery({
    queryKey: ['health', 'activity', date],
    queryFn: () => readDayActivity(parseISO(date), new Date()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return enabled ? (data ?? null) : null;
}
