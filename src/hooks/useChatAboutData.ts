import { useMutation } from '@tanstack/react-query';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import {
  buildComparisons,
  comparisonsForModel,
  parseChatReply,
  type ChatPeriod,
  type ChatReply,
  type ComparisonCard,
  type ComparisonId,
} from '@/lib/chatReply';
import { todayLocalDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';

// Plain-text history sent to the model (assistant turns are flattened — see
// replyAsText in lib/chatReply.ts).
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAboutDataResponse {
  reply?: unknown;
  error?: string;
}

export interface ChatResult {
  reply: ChatReply | null;
  // Cards for this period, so the screen can draw the one the model picked.
  comparisons: Partial<Record<ComparisonId, ComparisonCard>>;
  error: string | null;
}

export function useChatAboutData(period: ChatPeriod) {
  const locale = useLocaleStore((s) => s.locale);
  const { checkins } = useCheckinHistory(365);
  const { logs } = useExerciseLogHistory(period);

  return useMutation({
    mutationFn: async (messages: ChatMessage[]): Promise<ChatResult> => {
      // Computed here, not by the model: the same numbers go to the model as
      // `stats` and to the bars on screen.
      const comparisons = buildComparisons(checkins, logs, todayLocalDate(), period);
      const { data, error } = await supabase.functions.invoke<ChatAboutDataResponse>('chat-about-data', {
        body: { locale, messages, period_days: period, stats: comparisonsForModel(comparisons) },
      });

      if (error) return { reply: null, comparisons, error: error.message };
      if (data?.error) return { reply: null, comparisons, error: data.error };
      return { reply: parseChatReply(data?.reply), comparisons, error: null };
    },
  });
}
