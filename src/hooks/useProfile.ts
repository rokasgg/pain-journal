import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { Profile, ProfileUpdate } from '@/types/database.types';

export function useProfile() {
  const { user } = useSession();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { profile: profile ?? null, isLoading };
}

export function useUpdateProfile() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      // Upsert rather than update — some accounts (pre-dating the profiles
      // trigger, or created via the dev-auth bypass) have no profiles row
      // yet, and a plain `.update()` would silently affect zero rows.
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...updates });
      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      }
    },
  });
}
