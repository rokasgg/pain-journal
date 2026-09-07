import Anthropic from "npm:@anthropic-ai/sdk@^0.68";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language-neutral by design — like analyze-patterns/physio-summary/
// physio-focus, output language is driven entirely by the `{ locale }` body
// param below (appended to this prompt as "Respond in ${language}."), not
// hardcoded here. The example values are just illustrating the field
// *shape*, not dictating a language.
const SYSTEM_PROMPT = `You are an expert physical therapy assistant and rehabilitation specialist. Your task is to analyze raw notes from a physiotherapy visit or direct user input, and transform them into a structured, safe, daily exercise routine.

STRICT GUIDELINES:
1. Do NOT invent dangerous or high-impact exercises (e.g., heavy deadlifts, plyometrics) unless explicitly requested in the notes.
2. Keep the routine lightweight and focused strictly on rehabilitation, stretching, and low-impact stabilization.
3. Every exercise must include target reps/duration and a concise safety execution cue.
4. If the provided input is vague, generate safe, conservative rehabilitation exercises appropriate for the mentioned body area.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this structure (no markdown formatting, no extra explanation text):

{
  "routine_title": "Short descriptive title",
  "summary": "1-2 sentences summarizing the goal.",
  "exercises": [
    {
      "id": "ex_1",
      "name": "Exercise name",
      "muscle_group": "Targeted muscle or area",
      "target_sets_reps": "e.g. 3 sets x 10 reps, or 30 sec.",
      "instructions": "Short (1-2 sentence) safe execution cue.",
      "caution_notes": "Symptom check cue (e.g. Stop if you feel a sharp shooting pain)"
    }
  ]
}`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  lt: "Lithuanian",
};

const REQUIRED_EXERCISE_FIELDS = [
  "id",
  "name",
  "muscle_group",
  "target_sets_reps",
  "instructions",
  "caution_notes",
] as const;

function isValidExercise(exercise) {
  return (
    exercise &&
    typeof exercise === "object" &&
    REQUIRED_EXERCISE_FIELDS.every(
      (field) => typeof exercise[field] === "string" && exercise[field].length > 0,
    )
  );
}

function isValidRoutinePayload(payload) {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.routine_title === "string" &&
    payload.routine_title.length > 0 &&
    typeof payload.summary === "string" &&
    Array.isArray(payload.exercises) &&
    payload.exercises.length > 0 &&
    payload.exercises.every(isValidExercise)
  );
}

// Claude is told to return ONLY the JSON object, but models sometimes still
// wrap it in a code fence and/or add a sentence of preamble/trailing text
// anyway. Strip a fence if present (wherever it is, not just at the very
// start/end), then fall back to slicing from the first "{" to the last "}"
// to drop any stray prose that's still left — much more forgiving than
// requiring the entire response to be exactly ```json ... ```.
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return candidate;

  return candidate.slice(start, end + 1);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locale = typeof body?.locale === "string" && LANGUAGE_NAMES[body.locale] ? body.locale : "en";

  const source = body?.source;
  if (source !== "physio_visit" && source !== "manual_input") {
    return new Response(
      JSON.stringify({ error: "source must be 'physio_visit' or 'manual_input'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Deliberately NOT trusting a body-supplied user_id (the spec listed one,
  // but every other write in this schema is scoped to the authenticated
  // session, not a client-supplied id — accepting one here would let any
  // authenticated caller write a routine into another user's account).
  const { data: profile } = await supabase
    .from("profiles")
    .select("injury_description")
    .eq("id", user.id)
    .single();

  const diagnosisOrBodyArea = profile?.injury_description?.trim() || "Not specified";

  let physioNotesOrRawInput: string;
  let muscleStatesJson: string;
  let physioVisitId: string | null = null;

  if (source === "physio_visit") {
    physioVisitId = typeof body?.physio_visit_id === "string" ? body.physio_visit_id : null;
    if (!physioVisitId) {
      return new Response(JSON.stringify({ error: "physio_visit_id is required for source 'physio_visit'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from("physio_assessments")
      .select("overall_notes, physio_name, visit_date, muscle_findings(muscle_name, status, side, severity, notes)")
      .eq("id", physioVisitId)
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(JSON.stringify({ error: "Physio visit not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    physioNotesOrRawInput = assessment.overall_notes?.trim() || "No notes recorded for this visit.";
    muscleStatesJson = JSON.stringify(assessment.muscle_findings ?? []);
  } else {
    const inputText = typeof body?.input_text === "string" ? body.input_text.trim() : "";
    if (!inputText) {
      return new Response(JSON.stringify({ error: "input_text is required for source 'manual_input'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    physioNotesOrRawInput = inputText;
    muscleStatesJson = "N/A";
  }

  // Client-supplied exercises to keep from the user's previous routine —
  // spliced in verbatim after Claude's response, never sent through Claude
  // itself (asking an LLM to "reproduce unchanged" risks subtle rewording,
  // and these are already known-good). Validated below with the same
  // isValidExercise() used for Claude's own output, since this is now
  // client-supplied data unlike the rest of this function's inputs.
  const carryForwardExercises = Array.isArray(body?.carry_forward_exercises)
    ? body.carry_forward_exercises.filter(isValidExercise)
    : [];

  const userMessage = `INPUT DATA:
- Patient Diagnosis / Main Issue: ${diagnosisOrBodyArea}
- Physio Visit Notes & Recommendations: ${physioNotesOrRawInput}
- Muscle States Recorded (if available): ${muscleStatesJson}`;

  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    // 1400 was too low — a routine with several exercises (each with a
    // name/muscle_group/sets-reps/instructions/caution_notes, especially in
    // Lithuanian) routinely ran past that and got cut off mid-JSON, which is
    // exactly what caused "Failed to parse the generated routine": the
    // response wasn't malformed, it was truncated.
    max_tokens: 3000,
    output_config: { effort: "low" },
    system: `${SYSTEM_PROMPT}\n\nRespond in ${LANGUAGE_NAMES[locale]}.`,
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "refusal") {
    return new Response(JSON.stringify({ error: "Routine generation was declined. Please try again later." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (response.stop_reason === "max_tokens") {
    // Distinguish this from a genuine parse failure — the JSON is truncated,
    // not malformed, so "try again" alone won't help if it happens
    // repeatedly (max_tokens needs raising further instead).
    console.error("generate-routine: response was truncated at max_tokens", {
      usage: response.usage,
    });
    return new Response(
      JSON.stringify({ error: "The generated routine was too long and got cut off. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");

  let parsed;
  try {
    parsed = JSON.parse(extractJson(textBlock?.text ?? ""));
  } catch (parseError) {
    // Logged (visible in the Supabase Dashboard's Edge Function logs) so a
    // parse failure can actually be diagnosed — what Claude returned matters
    // far more than the generic message the client gets.
    console.error("generate-routine: failed to parse Claude response", {
      parseError,
      rawText: textBlock?.text,
    });
    return new Response(JSON.stringify({ error: "Failed to parse the generated routine. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate shape before writing anything — never insert a routine row
  // with a malformed exercises array.
  if (!isValidRoutinePayload(parsed)) {
    console.error("generate-routine: parsed JSON failed shape validation", { parsed });
    return new Response(JSON.stringify({ error: "Generated routine had an invalid structure. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Nothing is saved here anymore — this returns a draft for the client to
  // review/edit on routine/review.tsx; the actual insert (with is_active:
  // true, which is what triggers deactivate_other_routines() in
  // supabase_routines_migration.sql) happens client-side via
  // useCreateRoutine() only once the user confirms/edits and taps Save.
  const exercises = [...carryForwardExercises, ...parsed.exercises];

  return new Response(
    JSON.stringify({ routine_title: parsed.routine_title, summary: parsed.summary, exercises }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
