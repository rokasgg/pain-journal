import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPORT_WINDOW_DAYS = 30;

const SYSTEM_PROMPT = `You are writing a clinical handoff summary of a patient's self-reported neck/back pain journal, to be read by their physiotherapist before or during an appointment. The clinician should be able to skim it in under 15 seconds and get an accurate, concrete picture of the last ${REPORT_WINDOW_DAYS} days.

You will receive JSON with:
- "injury": the patient's self-reported injury context, if any (injury_started_on, injury_description — may mention specific levels/areas, e.g. cervical disc levels). May be null if not filled in. Mention it only if it changes how the clinician should read the rest of the summary.
- "checkins": twice-daily entries (morning/evening) with pain_level, stiffness_level, range_of_motion, sleep fields (morning only), activity/exercise fields including exercise_hours and exercise_intensity (evening only), symptoms, triggers, notes.
- "flareUps": ad-hoc pain-spike events with pain_level, likely_cause, description, occurred_at.

Write a short, plain-text report (no markdown symbols like # or **) with exactly two sections:

WHAT CHANGED — 2-3 sentences: the pain/stiffness/range-of-motion trend across the period (compare the earlier half of the window to the more recent half — e.g. "Pain stable at 0-3, stiffness stays high at 5-8 with no clear improvement"). Numbers over adjectives.

WHAT TO MENTION TO THE PHYSIO — a bullet list, max 4-5 bullets, each one short line. Merge flare-ups and trigger patterns into one practical list (e.g. "3 flare-ups in 2 weeks, all on the right side", "Correlates with poor sleep — 2 of 3 cases"). Each flare-up has a "status" ("resolved"/"ongoing"/"unknown") and, when resolved, "resolved_duration_minutes". When multiple flare-ups have a known duration, report the average duration alongside frequency (e.g. "3 flare-ups in 2 weeks, avg 1.5 days") instead of frequency alone — convert minutes to hours/days for readability. Only include a bullet if the data actually supports it — fewer, sharper bullets beat padding to reach 5.

Hard limits: each section is at most 3 sentences or 5 bullets, whichever applies. Be concrete and terse — no throat-clearing, no restating the same point twice, no generic filler phrases ("it is important to note that", "overall it seems", etc). Only report patterns clearly supported by the data — do not invent correlations from too few data points. End with one plain sentence stating this is patient-reported data, not a diagnosis.`;

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

  const since = new Date(Date.now() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
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
      .select("occurred_at, pain_level, likely_cause, description, status, resolved_duration_minutes, pain_areas, symptoms, triggers")
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

  if (entryCount < 4) {
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
    max_tokens: 900,
    output_config: { effort: "low" },
    system: `${SYSTEM_PROMPT}\n\nRespond in ${LANGUAGE_NAMES[locale]}.`,
    messages: [{ role: "user", content: JSON.stringify({ injury: profile ?? null, checkins, flareUps }) }],
  });

  if (response.stop_reason === "refusal") {
    return new Response(JSON.stringify({ error: "Summary was declined. Please try again later." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const textBlock = response.content.find((block) => block.type === "text");
  const summary = textBlock?.text ?? "";
  const generatedAt = new Date().toISOString();

  await supabase
    .from("profiles")
    .update({ last_physio_summary: summary, last_physio_summary_at: generatedAt })
    .eq("id", user.id);

  return new Response(JSON.stringify({ summary, generatedAt }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
