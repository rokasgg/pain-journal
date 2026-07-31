import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import type { FlareUp, FlareUpInsert } from '@/types/database.types';

export function useFlareUps(days = 30) {
  const { user } = useSession();
  const since = subDays(new Date(), days).toISOString();

  const { data: flareUps, isLoading } = useQuery({
    queryKey: ['flareUps', user?.id, days],
    queryFn: async (): Promise<FlareUp[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('flare_ups')
        .select('*')
        .eq('user_id', user.id)
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FlareUp[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { flareUps: flareUps ?? [], isLoading };
}

export function useCreateFlareUp() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      flareUp: Omit<FlareUpInsert, 'user_id' | 'occurred_at'>,
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in.' };

      const { error } = await supabase
        .from('flare_ups')
        .insert({ ...flareUp, user_id: user.id, occurred_at: new Date().toISOString() });

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['flareUps', user?.id] });
      }
    },
  });
}
