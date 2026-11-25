import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Daily caps on billed AI calls (supabase_ai_usage_migration.sql). A message
// is reserved atomically BEFORE the Claude call, then its tokens are added
// (or the message refunded) afterwards. The day is UTC.

export const CHAT_FEATURE = "chat";
export const CHAT_DAILY_MESSAGES = 30;
// Second guard: a few very long conversations can't run up the bill either.
export const CHAT_DAILY_TOKENS = 400_000;

export type UsageCheck = { ok: true; remaining: number } | { ok: false; response: Response };

/** `admin` must be a service-role client (only it can call the RPCs). */
export async function consumeChatMessage(
  admin: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<UsageCheck> {
  const { data, error } = await admin.rpc("consume_ai_message", {
    p_user: userId,
    p_feature: CHAT_FEATURE,
    p_max_messages: CHAT_DAILY_MESSAGES,
    p_max_tokens: CHAT_DAILY_TOKENS,
  });

  if (error) {
    // Fail closed: without the table/RPC we can't bound the cost.
    console.error("aiUsage: consume_ai_message failed", error.message);
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "The AI assistant is unavailable right now." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  if (typeof data !== "number") {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Daily limit reached.", error_code: "ai_limit_reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true, remaining: Math.max(0, CHAT_DAILY_MESSAGES - data) };
}

export interface CallUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Best-effort: logs and never throws. */
export async function recordChatUsage(
  admin: SupabaseClient,
  userId: string,
  usage: CallUsage | null,
  { refund }: { refund: boolean },
): Promise<void> {
  const input =
    (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0);
  const output = usage?.output_tokens ?? 0;
  try {
    const { error } = await admin.rpc("record_ai_usage", {
      p_user: userId,
      p_feature: CHAT_FEATURE,
      p_input: input,
      p_output: output,
      p_refund: refund,
    });
    if (error) console.error("aiUsage: record_ai_usage failed", error.message);
  } catch (e) {
    console.error("aiUsage: record_ai_usage threw", e instanceof Error ? e.message : String(e));
  }
}
