import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAT_SYSTEM_PROMPT = `You are answering a specific question from the user about their personal neck/back pain journal — a conversational follow-up, not a fixed report.

You will receive JSON with:
- "injury": the user's self-reported injury context, if any (injury_started_on, injury_description — may mention specific levels/areas, e.g. cervical disc levels). Use this as background to interpret the data. It may be null if the user hasn't filled it in.
- "checkins": twice-daily entries (morning/evening) with pain_level, stiffness_level, range_of_motion, sleep fields (morning only), activity/exercise fields including exercise_hours and exercise_intensity (evening only), symptoms, triggers, notes.
- "flareUps": ad-hoc pain-spike events with pain_level, likely_cause, description, occurred_at.

Answer only what's actually supported by this data — if the data is too sparse or noisy to answer confidently, say so rather than speculating. Keep replies conversational and concise (a few sentences, not a bulleted report), and remember prior turns in this conversation when answering follow-ups.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  lt: "Lithuanian",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let locale = "en";
  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    if (typeof body?.locale === "string" && LANGUAGE_NAMES[body.locale]) {
      locale = body.locale;
    }
    if (Array.isArray(body?.messages)) {
      messages = body.messages;
    }
  } catch {
    // No/invalid JSON body — fall back to defaults.
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No question provided." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().slice(0, 10);

  const [
    { data: checkins, error: checkinsError },
    { data: flareUps, error: flareUpsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("checkins")
      .select(
        "type, checkin_date, pain_level, stiffness_level, range_of_motion, sleep_quality, sleep_hours, woke_up_with_pain, sleep_position, activity_level, screen_time_hours, did_exercises, exercise_hours, exercise_intensity, symptoms, triggers, notes",
      )
      .gte("checkin_date", sinceDate)
      .order("checkin_date"),
    supabase
      .from("flare_ups")
      .select("occurred_at, pain_level, likely_cause, description")
      .gte("occurred_at", since.toISOString())
      .order("occurred_at"),
    supabase
      .from("profiles")
      .select("injury_started_on, injury_description")
      .eq("id", user.id)
      .single(),
  ]);

  if (checkinsError || flareUpsError || profileError) {
    return new Response(
      JSON.stringify({
        error: (checkinsError ?? flareUpsError ?? profileError)?.message ?? "Failed to load data.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const entryCount = (checkins?.length ?? 0) + (flareUps?.length ?? 0);

  if (entryCount < 6) {
    return new Response(
      JSON.stringify({
        error: "Not enough data yet — log a few more check-ins over the next week or two, then try again.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "medium" },
    system: `${CHAT_SYSTEM_PROMPT}\n\nUser's data as JSON:\n${JSON.stringify({ injury: profile ?? null, checkins, flareUps })}\n\nRespond in ${LANGUAGE_NAMES[locale]}.`,
    messages,
  });

  if (response.stop_reason === "refusal") {
    return new Response(JSON.stringify({ error: "That question was declined. Please try rephrasing it." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const textBlock = response.content.find((block) => block.type === "text");
  const reply = textBlock?.text ?? "";

  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
