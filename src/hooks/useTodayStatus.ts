import { useTodayCheckins } from '@/hooks/useCheckins';

export function useTodayStatus() {
  const { checkins, isLoading } = useTodayCheckins();

  return {
    morningDone: checkins.some((c) => c.type === 'morning'),
    eveningDone: checkins.some((c) => c.type === 'evening'),
    isLoading,
  };
}
