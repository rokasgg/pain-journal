import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are summarizing a patient's physiotherapy assessment history into ONE short sentence (max ~15 words) for a home-screen widget titled "current focus".

You will receive JSON: an array of the patient's most recent physio assessments, each with a visit_date and a list of muscle_findings (muscle_name, status: weak/tight/normal/improving, side, severity 0-10, notes).

Write one sentence naming the 1-3 muscles or actions most worth focusing on right now. Weigh the most recent assessment most heavily, but note if a muscle's status has changed across assessments (e.g. weak became improving, or a new area became tight). Plain text only, no markdown, no preamble, no quotation marks.`;

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

  const { data: assessments, error: assessmentsError } = await supabase
    .from("physio_assessments")
    .select("visit_date, physio_name, overall_notes, muscle_findings(muscle_name, status, side, severity, notes)")
    .eq("user_id", user.id)
    .order("visit_date", { ascending: false })
    .limit(5);

  if (assessmentsError) {
    return new Response(JSON.stringify({ error: assessmentsError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!assessments || assessments.length === 0) {
    return new Response(JSON.stringify({ summary: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 256,
    output_config: { effort: "low" },
    system: `${SYSTEM_PROMPT}\n\nRespond in ${LANGUAGE_NAMES[locale]}.`,
    messages: [{ role: "user", content: JSON.stringify({ assessments }) }],
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
    .update({ last_physio_focus_summary: summary, last_physio_focus_summary_at: generatedAt })
    .eq("id", user.id);

  return new Response(JSON.stringify({ summary, generatedAt }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
