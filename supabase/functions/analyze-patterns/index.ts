import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are analyzing a personal neck/back pain journal for patterns the user may not notice by eyeballing a chart.

You will receive JSON with two arrays:
- "checkins": twice-daily entries (morning/evening) with pain_level, stiffness_level, range_of_motion, sleep fields (morning only), activity fields (evening only), symptoms, triggers, notes.
- "flareUps": ad-hoc pain-spike events with pain_level, likely_cause, description, occurred_at.

Find concrete, evidence-based correlations — e.g. "pain is consistently higher the morning after >6hrs of screen time," "flare-ups cluster on days logged with poor sleep or a specific trigger," "sleeping on the stomach precedes higher morning stiffness." Only report patterns actually supported by the data provided — do not invent correlations from too few data points, and say so if the data is too sparse or noisy to conclude anything.

Respond in plain text with a short bulleted list (max 6 bullets), each bullet one or two sentences. No preamble, no markdown headers.`;

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

  const [{ data: checkins, error: checkinsError }, { data: flareUps, error: flareUpsError }] =
    await Promise.all([
      supabase
        .from("checkins")
        .select(
          "type, checkin_date, pain_level, stiffness_level, range_of_motion, sleep_quality, sleep_hours, woke_up_with_pain, sleep_position, activity_level, screen_time_hours, did_exercises, symptoms, triggers, notes",
        )
        .gte("checkin_date", sinceDate)
        .order("checkin_date"),
      supabase
        .from("flare_ups")
        .select("occurred_at, pain_level, likely_cause, description")
        .gte("occurred_at", since.toISOString())
        .order("occurred_at"),
    ]);

  if (checkinsError || flareUpsError) {
    return new Response(
      JSON.stringify({ error: (checkinsError ?? flareUpsError)?.message ?? "Failed to load data." }),
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
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify({ checkins, flareUps }) }],
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
