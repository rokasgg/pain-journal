import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';

interface PhysioSummaryResponse {
  summary?: string;
  error?: string;
}

export function useGeneratePhysioSummary() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);

  return useMutation({
    mutationFn: async (): Promise<{ summary: string | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<PhysioSummaryResponse>('physio-summary', {
        body: { locale },
      });

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
