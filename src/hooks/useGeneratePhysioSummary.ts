import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

interface PhysioSummaryResponse {
  summary?: string;
  error?: string;
}

export function useGeneratePhysioSummary() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ summary: string | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<PhysioSummaryResponse>('physio-summary');

      if (error) return { summary: null, error: error.message };
      if (data?.error) return { summary: null, error: data.error };

      return { summary: data?.summary ?? null, error: null };
    },
    onSuccess: (result) => {
      if (result.summary) {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      }
    },
  });
}
