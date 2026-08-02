import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

interface AnalyzePatternsResponse {
  analysis?: string;
  error?: string;
}

export function useAnalyzePatterns() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ analysis: string | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<AnalyzePatternsResponse>(
        'analyze-patterns',
      );

      if (error) return { analysis: null, error: error.message };
      if (data?.error) return { analysis: null, error: data.error };

      return { analysis: data?.analysis ?? null, error: null };
    },
    onSuccess: (result) => {
      if (result.analysis) {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      }
    },
  });
}
