import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import type { Profile, ProfileUpdate } from '@/types/database.types';

export function useProfile() {
  const { user } = useSession();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data as Profile;
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
      if (!user) return { error: 'Not signed in.' };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      }
    },
  });
}
