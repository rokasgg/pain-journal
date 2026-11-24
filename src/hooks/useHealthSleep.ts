import { useQuery } from '@tanstack/react-query';

import { readLastNightSleep } from '@/lib/health/healthkit';
import type { HealthSleep } from '@/lib/sleep';
import { useHealthStore } from '@/store/useHealthStore';
import { useToday } from '@/store/useTodayStore';

// Last night's sleep from Apple Health, for the morning check-in's "Kiek
// miegojote?" card (design: "Rytas – miegas (Apple Sveikata)"). null when
// Health isn't connected (Settings → Apple Health), unavailable (Android, old
// builds) or has nothing for last night: the card then shows the −/+ stepper.
export function useHealthSleep(): HealthSleep | null {
  const enabled = useHealthStore((s) => s.enabled);
  const today = useToday();
  const { data } = useQuery({
    queryKey: ['health', 'sleep', today],
    queryFn: () => readLastNightSleep(new Date()),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return enabled ? (data ?? null) : null;
}
