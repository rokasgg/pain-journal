// What the AI functions (chat-about-data, analyze-patterns, physio-summary)
// know about the user beyond their entries: the injury, the professional's
// diagnosis, and the onboarding / Settings → About me answers. One builder and
// one prompt block, so all three read the same thing.

// Profile columns to select (supabase_profile_lifestyle_migration.sql).
export const ABOUT_PROFILE_COLUMNS = [
  "injury_started_on",
  "injury_started_approx",
  "injury_description",
  "diagnosis_status",
  "diagnosis_text",
  "diagnosed_by",
  "diagnosed_on",
  "diagnosis_notes",
  "pain_locations",
  "pain_character",
  "work_type",
  "work_hours",
  "life_stress",
  "exercise_frequency",
  "suspected_triggers",
  "worst_time_of_day",
].join(", ");

// The check-in column, renamed so the model can't confuse a day's stress with
// the user's usual stress level ("usual_stress" below).
export const TODAYS_STRESS_SELECT = "todays_stress:stress_level";

type Row = Record<string, unknown> | null;

const DIAGNOSED_BY: Record<string, string> = {
  family_doctor: "family doctor",
  specialist: "specialist doctor",
  physio: "physiotherapist",
  chiropractor: "chiropractor",
  other: "a professional",
};

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function buildAbout(profile: Row) {
  if (!profile) return null;
  const diagnosed = profile.diagnosis_status === "yes" && typeof profile.diagnosis_text === "string";
  const by = DIAGNOSED_BY[String(profile.diagnosed_by)] ?? "a professional";

  return {
    injury: {
      started_on: profile.injury_started_on ?? null,
      started_on_is_approximate: profile.injury_started_approx === true,
      description: profile.injury_description ?? null,
    },
    diagnosis: diagnosed
      ? {
          label: `Diagnosis given by ${by}${profile.diagnosed_on ? `, ${profile.diagnosed_on}` : ""}`,
          text: profile.diagnosis_text,
          notes: profile.diagnosis_notes ?? null,
        }
      : { status: profile.diagnosis_status ?? "not answered" },
    pain_areas: list(profile.pain_locations),
    pain_character: list(profile.pain_character),
    usual_day: {
      work_type: profile.work_type ?? null,
      work_hours: profile.work_hours ?? null,
      usual_stress: profile.life_stress ?? null,
      exercise_frequency: profile.exercise_frequency ?? null,
    },
    user_hunches: {
      thinks_makes_it_worse: list(profile.suspected_triggers),
      says_worst_time_is: profile.worst_time_of_day ?? null,
    },
  };
}

export const ABOUT_PROMPT = `"about" is background on the user (may be null):
- "injury": when it started ("started_on_is_approximate": true means a rough guess) and what happened, in their words.
- "diagnosis": when present with a "label", it is a diagnosis a professional gave the user, recorded as they were told it. Use it as clinical context. Never second-guess it, never suggest a different or additional diagnosis. Otherwise there is no professional diagnosis on record; never offer one.
- "pain_areas", "pain_character": what they told us at the start.
- "usual_day": their typical work (sitting/standing/physical, hours) and "usual_stress", their GENERAL stress level. A check-in's "todays_stress" (1 calm, 2 normal, 3 stressful, 4 very stressful) is that ONE day's stress. Never mix the two up.
- "user_hunches": what the user THINKS makes it worse and when they think it is worst. These are guesses, not facts. You may say whether their entries support or contradict a hunch, based only on the data.
SAFETY: a recorded diagnosis never overrides the urgent-symptom rule. New numbness, tingling or weakness, loss of grip or coordination, trouble walking or speaking, bladder or bowel changes, or sudden severe or unusual pain still mean "contact your doctor" (or emergency services when severe), even when it seems to fit the diagnosis.`;
