import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';

import { useSession } from '@/hooks/useSession';
import { todayLocalDate } from '@/lib/dates';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Checkin, CheckinInsert } from '@/types/database.types';

export function useTodayCheckins() {
  const { user } = useSession();
  const date = todayLocalDate();

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['checkins', 'today', user?.id, date],
    queryFn: async (): Promise<Checkin[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', date);
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
    enabled: !!user,
  });

  return { checkins: checkins ?? [], isLoading };
}

export function useCheckinsForDate(date: string) {
  const { user } = useSession();

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['checkins', 'date', user?.id, date],
    queryFn: async (): Promise<Checkin[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', date);
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
    enabled: !!user && !!date,
  });

  return { checkins: checkins ?? [], isLoading };
}

export function useCheckinHistory(days = 30) {
  const { user } = useSession();
  const since = subDays(new Date(), days).toISOString().slice(0, 10);

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['checkins', 'history', user?.id, days],
    queryFn: async (): Promise<Checkin[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checkin_date', since)
        .order('checkin_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { checkins: checkins ?? [], isLoading };
}

export function useUpsertCheckin() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      checkin: Omit<CheckinInsert, 'user_id'>,
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('checkins')
        .upsert({ ...checkin, user_id: user.id }, { onConflict: 'user_id,checkin_date,type' });

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['checkins', 'today', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['checkins', 'history', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['checkins', 'date', user?.id] });
      }
    },
  });
}
