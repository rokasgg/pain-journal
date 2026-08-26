import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAboutDataResponse {
  reply?: string;
  error?: string;
}

export function useChatAboutData() {
  const locale = useLocaleStore((s) => s.locale);

  return useMutation({
    mutationFn: async (messages: ChatMessage[]): Promise<{ reply: string | null; error: string | null }> => {
      const { data, error } = await supabase.functions.invoke<ChatAboutDataResponse>('chat-about-data', {
        body: { locale, messages },
      });

      if (error) return { reply: null, error: error.message };
      if (data?.error) return { reply: null, error: data.error };

      return { reply: data?.reply ?? null, error: null };
    },
  });
}
