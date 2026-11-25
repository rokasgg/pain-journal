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
import { extractFunctionErrorMessage } from '@/lib/functionsError';
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
  // Messages left today (the daily cap, supabase/functions/_shared/aiUsage.ts).
  // Missing on a hard-coded red-flag reply, which doesn't count.
  remaining?: number;
  error?: string;
}

export interface ChatResult {
  reply: ChatReply | null;
  // Cards for this period, so the screen can draw the one the model picked.
  comparisons: Partial<Record<ComparisonId, ComparisonCard>>;
  remaining: number | null;
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

      if (error) {
        return { reply: null, comparisons, remaining: null, error: await extractFunctionErrorMessage(error, error.message) };
      }
      if (data?.error) return { reply: null, comparisons, remaining: null, error: data.error };
      const remaining = typeof data?.remaining === 'number' ? data.remaining : null;
      return { reply: parseChatReply(data?.reply), comparisons, remaining, error: null };
    },
  });
}
