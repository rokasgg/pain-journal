import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { useEffect, useRef } from 'react';

import { useSession } from '@/hooks/useSession';
import { minutesSince } from '@/lib/dates';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { FlareUp, FlareUpInsert } from '@/types/database.types';

const FOLLOW_UP_WINDOW_DAYS = 5;

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

export function useUpdateFlareUp() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Omit<FlareUpInsert, 'user_id'>>): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('flare_ups')
        .update({ ...updates, status_updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['flareUps', user?.id] });
      }
    },
  });
}

// Best-effort: any flare-up still 'ongoing'/'unknown' after FOLLOW_UP_WINDOW_DAYS
// gets auto-closed so nothing stays "open" forever without the user having to
// keep answering the morning follow-up prompt. Same silent-failure convention
// as refreshPhysioFocus in usePhysioAssessments.ts.
async function autoResolveStaleFlareUps(userId: string) {
  try {
    const { data: stale } = await supabase
      .from('flare_ups')
      .select('id, occurred_at')
      .eq('user_id', userId)
      .in('status', ['ongoing', 'unknown']);

    if (!stale) return;

    const cutoff = subDays(new Date(), FOLLOW_UP_WINDOW_DAYS);
    const toResolve = stale.filter((flareUp) => new Date(flareUp.occurred_at) < cutoff);

    await Promise.all(
      toResolve.map((flareUp) =>
        supabase
          .from('flare_ups')
          .update({
            status: 'resolved',
            status_updated_at: new Date().toISOString(),
            resolved_duration_minutes: minutesSince(flareUp.occurred_at),
            resolution_note: 'auto-resolved after 5 days',
          })
          .eq('id', flareUp.id),
      ),
    );
  } catch {
    // Silently ignore — the prompt just won't refresh until next time.
  }
}

// Drives the morning check-in's optional flare-up follow-up prompt: the most
// recent flare-up from the last FOLLOW_UP_WINDOW_DAYS whose status is still
// 'ongoing'/'unknown', or null if there's nothing to ask about.
export function useFlareUpFollowUpCandidate() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { flareUps, isLoading } = useFlareUps(FOLLOW_UP_WINDOW_DAYS);
  const hasSweptRef = useRef(false);

  useEffect(() => {
    if (!user || hasSweptRef.current) return;
    hasSweptRef.current = true;
    void autoResolveStaleFlareUps(user.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['flareUps', user.id] });
    });
  }, [user, queryClient]);

  if (isLoading) return null;

  return flareUps.find((flareUp) => flareUp.status === 'ongoing' || flareUp.status === 'unknown') ?? null;
}

export function useCreateFlareUp() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      flareUp: Omit<FlareUpInsert, 'user_id'>,
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('flare_ups')
        .insert({ ...flareUp, user_id: user.id, status_updated_at: new Date().toISOString() });

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['flareUps', user?.id] });
      }
    },
  });
}
