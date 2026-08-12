import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are analyzing a personal neck/back pain journal for patterns the user may not notice by eyeballing a chart.

You will receive JSON with:
- "injury": the user's self-reported injury context, if any (injury_started_on, injury_description — may mention specific levels/areas, e.g. cervical disc levels). Use this as background to interpret the data, e.g. relate symptoms/triggers back to the described injury area when relevant. It may be null if the user hasn't filled it in.
- "checkins": twice-daily entries (morning/evening) with pain_level, stiffness_level, range_of_motion, sleep fields (morning only), activity/exercise fields including exercise_hours and exercise_intensity (evening only), symptoms, triggers, notes.
- "flareUps": ad-hoc pain-spike events with pain_level, likely_cause, description, occurred_at.

Find concrete, evidence-based correlations — e.g. "pain is consistently higher the morning after >6hrs of screen time," "flare-ups cluster on days logged with poor sleep or a specific trigger," "sleeping on the stomach precedes higher morning stiffness." Only report patterns actually supported by the data provided — do not invent correlations from too few data points, and say so if the data is too sparse or noisy to conclude anything.

Respond in plain text with a short bulleted list (max 6 bullets), each bullet one or two sentences. No preamble, no markdown headers.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  lt: "Lithuanian",
};

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
  try {
    const body = await req.json();
    if (typeof body?.locale === "string" && LANGUAGE_NAMES[body.locale]) {
      locale = body.locale;
    }
  } catch {
    // No/invalid JSON body — fall back to English.
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
    system: `${SYSTEM_PROMPT}\n\nRespond in ${LANGUAGE_NAMES[locale]}.`,
    messages: [{ role: "user", content: JSON.stringify({ injury: profile ?? null, checkins, flareUps }) }],
  });

  if (response.stop_reason === "refusal") {
    return new Response(JSON.stringify({ error: "Analysis was declined. Please try again later." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const textBlock = response.content.find((block) => block.type === "text");
  const analysis = textBlock?.text ?? "";
  const analyzedAt = new Date().toISOString();

  await supabase
    .from("profiles")
    .update({ last_pattern_analysis: analysis, last_pattern_analysis_at: analyzedAt })
    .eq("id", user.id);

  return new Response(JSON.stringify({ analysis, analyzedAt }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
