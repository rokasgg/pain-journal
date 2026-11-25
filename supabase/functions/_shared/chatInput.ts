// Input hygiene for chat-about-data: caps on what the client can send, and a
// compact summary of the user's data instead of raw rows. Pure, no imports.

export const MAX_USER_CHARS = 500;
export const MAX_ASSISTANT_CHARS = 1200;
export const MAX_HISTORY_MESSAGES = 10;
const MAX_NOTE_CHARS = 150;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type SanitiseResult =
  | { ok: true; messages: ChatTurn[]; question: string }
  | { ok: false; error_code: "no_question" | "message_too_long" };

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Keeps well-formed turns only, the last MAX_HISTORY_MESSAGES of them,
 * starting with a user turn. The newest question is rejected (never
 * silently cut) when it's over MAX_USER_CHARS; older turns are clipped.
 */
export function sanitiseChatMessages(raw: unknown): SanitiseResult {
  if (!Array.isArray(raw)) return { ok: false, error_code: "no_question" };

  const turns: ChatTurn[] = raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant") &&
        typeof (m as ChatTurn).content === "string" &&
        (m as ChatTurn).content.trim().length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  const last = turns[turns.length - 1];
  if (!last || last.role !== "user") return { ok: false, error_code: "no_question" };
  if (last.content.length > MAX_USER_CHARS) return { ok: false, error_code: "message_too_long" };

  let recent = turns.slice(-MAX_HISTORY_MESSAGES);
  while (recent.length > 0 && recent[0].role !== "user") recent = recent.slice(1);

  const messages = recent.map((m, i) =>
    i === recent.length - 1
      ? m
      : { role: m.role, content: clip(m.content, m.role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS) },
  );
  return { ok: true, messages, question: last.content };
}

// ---------------------------------------------------------------------------
// Compact data summary

type Row = Record<string, unknown>;

const SYMPTOM_FLAGS = ["tingling", "numbness", "weakness", "headache", "dizziness"] as const;

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function list(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function text(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? clip(v.trim(), MAX_NOTE_CHARS) : undefined;
}

// Drops undefined/null keys so absent answers cost no tokens.
function compact(obj: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null) out[k] = v;
  return out;
}

function symptoms(raw: unknown): Row {
  if (!raw || typeof raw !== "object") return {};
  const s = raw as Row;
  const flags = SYMPTOM_FLAGS.filter((k) => s[k] === true);
  const all = [...flags, ...(list(s.custom) ?? [])];
  return compact({
    sym: all.length > 0 ? all : undefined,
    areas: list(s.pain_areas),
    rad: text(s.radiating_to),
  });
}

function slot(c: Row): Row {
  const shared = {
    pain: num(c.pain_level),
    stiff: num(c.stiffness_level),
    rom: num(c.range_of_motion),
    ...symptoms(c.symptoms),
    trig: list(c.triggers),
    note: text(c.notes),
  };
  if (c.type === "morning") {
    return compact({
      ...shared,
      sq: num(c.sleep_quality),
      sh: num(c.sleep_hours),
      pos: list(c.sleep_positions) ?? (typeof c.sleep_position === "string" ? [c.sleep_position] : undefined),
    });
  }
  const workouts = Array.isArray(c.health_workouts)
    ? (c.health_workouts as Row[])
        .map((w) => (typeof w?.type === "string" ? `${w.type}:${num(w.minutes) ?? "?"}min` : null))
        .filter((w): w is string => !!w)
    : [];
  return compact({
    ...shared,
    act: num(c.activity_level),
    screen: num(c.screen_time_hours),
    stress: num(c.todays_stress),
    ex: c.did_exercises === false ? "none" : list(c.exercise_types),
    steps: num(c.steps),
    wk: workouts.length > 0 ? workouts : undefined,
  });
}

export interface DataSummary {
  totals: Row;
  days: Row[];
  flare_ups: Row[];
}

/**
 * One row per logged day ({d, m: morning, e: evening}) with short keys, plus
 * period totals. The legend is CHAT_DATA_LEGEND, sent in the system prompt.
 */
export function buildDataSummary(checkins: Row[] | null, flareUps: Row[] | null): DataSummary {
  const byDay = new Map<string, Row>();
  for (const c of checkins ?? []) {
    const d = typeof c.checkin_date === "string" ? c.checkin_date : null;
    if (!d || (c.type !== "morning" && c.type !== "evening")) continue;
    const day = byDay.get(d) ?? { d };
    day[c.type === "morning" ? "m" : "e"] = slot(c);
    byDay.set(d, day);
  }
  const days = [...byDay.values()].sort((a, b) => String(a.d).localeCompare(String(b.d)));

  const dailyAverages = days
    .map((day) => {
      const values = [day.m, day.e]
        .map((s) => num((s as Row | undefined)?.pain))
        .filter((v): v is number => v !== undefined);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
    })
    .filter((v): v is number => v !== undefined);

  const flares = (flareUps ?? []).map((f) =>
    compact({
      at: typeof f.occurred_at === "string" ? f.occurred_at : undefined,
      pain: num(f.pain_level),
      areas: list(f.pain_areas),
      sym: list(f.symptoms),
      trig: list(f.triggers) ?? (text(f.likely_cause) ? [text(f.likely_cause) as string] : undefined),
      note: text(f.description),
    }),
  );

  return {
    totals: compact({
      logged_days: days.length,
      avg_pain:
        dailyAverages.length > 0
          ? Math.round((dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length) * 10) / 10
          : undefined,
      pain_free_days: dailyAverages.filter((v) => v === 0).length,
      flare_ups: flares.length,
    }),
    days,
    flare_ups: flares,
  };
}

export const CHAT_DATA_LEGEND = `Data keys: "totals" = period totals (avg_pain is the mean of daily averages). "days" = one row per logged day: d = date, m = morning check-in, e = evening check-in. In a check-in: pain, stiff (stiffness) and rom (range of motion, higher is better) are 0-10; sq = sleep quality 0-10, sh = sleep hours, pos = sleep positions; act = activity 0-10, screen = screen-time hours, stress = 1 calm … 4 very stressful, ex = other exercise types ("none" = none), steps, wk = Apple Health workouts; sym = symptoms, areas = pain areas, rad = radiating to, trig = possible triggers, note = the user's note (may be shortened). A missing key means it wasn't answered. "flare_ups": at = start time (ISO timestamp, UTC), pain 1-10, areas, sym, trig, note.`;
