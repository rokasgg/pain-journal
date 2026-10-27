import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAT_SYSTEM_PROMPT = `You are the assistant inside a pain-journal app. The user asks about their own pain data; answer from that data only.

You will receive JSON with:
- "injury": the user's self-reported injury context (may be null).
- "period_days": how many days back the data covers.
- "checkins": twice-daily entries (morning/evening) with pain_level, stiffness_level, range_of_motion, sleep fields (morning only), activity/exercise fields (evening only), symptoms, triggers, notes.
- "flareUps": ad-hoc pain-spike events.
- "stats": comparisons the app already computed from the same data (any may be missing when there is too little data). Quote these numbers exactly; never recompute or invent numbers.

Reply by filling the JSON schema. Choose "kind":

1. "red_flag" — ONLY when the user's message describes something that may need urgent medical attention: new numbness, tingling or weakness in an arm or leg, loss of grip or coordination, trouble walking or speaking, loss of bladder/bowel control, chest pain, shortness of breath, sudden severe headache, high fever with back/neck pain, or severe pain after a fall or accident. Put 1-2 calm sentences in "red_flag_message": say a clinician should assess it soon rather than waiting for the next scheduled visit, and that if symptoms are severe, worsening or come with other problems, they should call emergency services (112). Do NOT analyse their data, diagnose, or guess a cause. Leave the other fields as empty strings / "none" / [].

2. "answer" — everything else.
   - "lead": a short bold opening that answers the question directly ("Yes, it looks that way." / "Not clearly."). May be empty.
   - "body": 1-3 conversational sentences using the data. Describe patterns; never claim a cause, never diagnose, never suggest treatment or medication.
   - "comparison": the stat that best backs your answer ("sleep_vs_morning_pain", "morning_vs_evening", "training_vs_rest"), only if it is present in "stats" and relevant; otherwise "none".
   - "caveat": one sentence on what the data can't show (correlation isn't cause; suggest discussing it with their physio). May be empty.
   - "follow_ups": 0-2 short natural follow-up questions the user could ask next that this data can answer.
   If the data is too sparse or noisy, say so plainly in "body" instead of speculating.`;

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["answer", "red_flag"] },
    lead: { type: "string" },
    body: { type: "string" },
    comparison: {
      type: "string",
      enum: ["sleep_vs_morning_pain", "morning_vs_evening", "training_vs_rest", "none"],
    },
    caveat: { type: "string" },
    follow_ups: { type: "array", items: { type: "string" } },
    red_flag_message: { type: "string" },
  },
  required: ["kind", "lead", "body", "comparison", "caveat", "follow_ups", "red_flag_message"],
  additionalProperties: false,
};

const ALLOWED_PERIODS = [7, 30, 90];

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
  let periodDays = 30;
  let stats: unknown = null;
  try {
    const body = await req.json();
    if (typeof body?.locale === "string" && LANGUAGE_NAMES[body.locale]) {
      locale = body.locale;
    }
    if (Array.isArray(body?.messages)) {
      messages = body.messages;
    }
    if (ALLOWED_PERIODS.includes(body?.period_days)) {
      periodDays = body.period_days;
    }
    // Computed on the phone from the same data; the model quotes it.
    if (body?.stats && typeof body.stats === "object") {
      stats = body.stats;
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

  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
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
      .select("occurred_at, pain_level, likely_cause, description, pain_areas, symptoms, triggers")
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

  // A red-flag message needs no data, so only gate the data analysis: the
  // model is told to say so when the period is thin.
  const entryCount = (checkins?.length ?? 0) + (flareUps?.length ?? 0);

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1500,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: REPLY_SCHEMA },
    },
    system: `${CHAT_SYSTEM_PROMPT}\n\nUser's data as JSON:\n${JSON.stringify({ injury: profile ?? null, period_days: periodDays, entry_count: entryCount, checkins, flareUps, stats })}\n\nWrite every string value in ${LANGUAGE_NAMES[locale]}.`,
    messages,
  });

  if (response.stop_reason === "refusal") {
    return new Response(JSON.stringify({ error: "That question was declined. Please try rephrasing it." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const textBlock = response.content.find((block) => block.type === "text");
  let reply: unknown = null;
  try {
    reply = JSON.parse(textBlock?.text ?? "");
  } catch {
    // Truncated or malformed — the client shows its generic error.
  }
  if (!reply) {
    return new Response(JSON.stringify({ error: "Couldn't read the answer. Please try again." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
