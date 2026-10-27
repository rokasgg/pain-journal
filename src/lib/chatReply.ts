import { morningVsEvening, sleepVsMorningPain } from '@/lib/insightFindings';
import { trainingVsRestNextDayPain } from '@/lib/trainingInsights';
import type { Checkin, ExerciseLog } from '@/types/database.types';

// AI assistant (insights/chat). The chat-about-data edge function answers in
// a fixed JSON shape (structured outputs), and the screen renders it:
//  - `answer`: an optional bold lead, the body, an optional comparison card,
//    an optional caveat, and up to 2 follow-up questions
//  - `red_flag`: a red safety card (call 112 / log a flare-up) instead of any
//    data analysis
// The comparison bars are never numbers the model wrote: the model only picks
// *which* comparison fits, and the app computes it from the user's own data
// (insightFindings.ts / trainingInsights.ts) — the same values it sends the
// model as `stats`, so the text and the bars agree.

export const CHAT_PERIODS = [7, 30, 90] as const;
export type ChatPeriod = (typeof CHAT_PERIODS)[number];
export const DEFAULT_CHAT_PERIOD: ChatPeriod = 30;

export const COMPARISON_IDS = ['sleep_vs_morning_pain', 'morning_vs_evening', 'training_vs_rest'] as const;
export type ComparisonId = (typeof COMPARISON_IDS)[number];

export interface ChatAnswer {
  kind: 'answer';
  lead: string;
  body: string;
  comparison: ComparisonId | null;
  caveat: string;
  followUps: string[];
}

export interface ChatRedFlag {
  kind: 'red_flag';
  message: string;
}

export type ChatReply = ChatAnswer | ChatRedFlag;

const MAX_FOLLOW_UPS = 2;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Validates the edge function's `reply` object. Anything malformed returns
// null, and the screen shows the generic error.
export function parseChatReply(raw: unknown): ChatReply | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (r.kind === 'red_flag') {
    const message = asString(r.red_flag_message);
    return message ? { kind: 'red_flag', message } : null;
  }
  if (r.kind !== 'answer') return null;

  const body = asString(r.body);
  const lead = asString(r.lead);
  if (!body && !lead) return null;
  const comparison = COMPARISON_IDS.find((id) => id === r.comparison) ?? null;
  const followUps = Array.isArray(r.follow_ups)
    ? r.follow_ups.map(asString).filter(Boolean).slice(0, MAX_FOLLOW_UPS)
    : [];
  return { kind: 'answer', lead, body, comparison, caveat: asString(r.caveat), followUps };
}

// What the model sees of an earlier assistant turn (history is plain text).
export function replyAsText(reply: ChatReply): string {
  if (reply.kind === 'red_flag') return reply.message;
  return [reply.lead, reply.body, reply.caveat].filter(Boolean).join(' ');
}

export interface ComparisonRow {
  // i18n key for the row label
  labelKey: string;
  value: number;
  tone: 'warm' | 'calm';
}

export interface ComparisonCard {
  id: ComparisonId;
  titleKey: string;
  rows: [ComparisonRow, ComparisonRow];
  entries: number;
  // CountNoun for the "Based on N …" line
  entriesNoun: 'morning' | 'entry';
}

type StatsCheckin = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'sleep_quality' | 'sleep_hours'>;

// Every comparison that has enough data in the period. Sent to the model as
// `stats` and used to draw the card for whichever one it picks.
export function buildComparisons(
  checkins: StatsCheckin[],
  logs: Pick<ExerciseLog, 'logged_at' | 'status'>[],
  today: string,
  days: ChatPeriod,
): Partial<Record<ComparisonId, ComparisonCard>> {
  const cards: Partial<Record<ComparisonId, ComparisonCard>> = {};

  const sleep = sleepVsMorningPain(checkins, today, days);
  if (sleep.status === 'ready') {
    cards.sleep_vs_morning_pain = {
      id: 'sleep_vs_morning_pain',
      titleKey: 'chat.cmpSleepTitle',
      rows: [
        { labelKey: 'chat.cmpPoorSleep', value: sleep.afterPoor, tone: 'warm' },
        { labelKey: 'chat.cmpGoodSleep', value: sleep.afterGood, tone: 'calm' },
      ],
      entries: sleep.entries,
      entriesNoun: 'morning',
    };
  }

  const slots = morningVsEvening(checkins, today, days);
  if (slots.status === 'ready') {
    cards.morning_vs_evening = {
      id: 'morning_vs_evening',
      titleKey: 'chat.cmpSlotsTitle',
      rows: [
        { labelKey: 'chat.cmpMorning', value: slots.morning, tone: 'warm' },
        { labelKey: 'chat.cmpEvening', value: slots.evening, tone: 'calm' },
      ],
      entries: slots.entries,
      entriesNoun: 'entry',
    };
  }

  const training = trainingVsRestNextDayPain(logs, checkins, today, days);
  if (training) {
    cards.training_vs_rest = {
      id: 'training_vs_rest',
      titleKey: 'chat.cmpTrainingTitle',
      rows: [
        { labelKey: 'chat.cmpAfterRest', value: training.afterRest, tone: 'warm' },
        { labelKey: 'chat.cmpAfterTraining', value: training.afterTraining, tone: 'calm' },
      ],
      entries: training.trainingDays + training.restDays,
      entriesNoun: 'entry',
    };
  }

  return cards;
}

// The compact form sent to the edge function: values rounded to what the
// card shows, so the model quotes the same numbers.
export function comparisonsForModel(cards: Partial<Record<ComparisonId, ComparisonCard>>) {
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    sleep_vs_morning_pain: cards.sleep_vs_morning_pain && {
      avg_morning_pain_after_poor_sleep: round(cards.sleep_vs_morning_pain.rows[0].value),
      avg_morning_pain_after_good_sleep: round(cards.sleep_vs_morning_pain.rows[1].value),
      mornings: cards.sleep_vs_morning_pain.entries,
    },
    morning_vs_evening: cards.morning_vs_evening && {
      avg_morning_pain: round(cards.morning_vs_evening.rows[0].value),
      avg_evening_pain: round(cards.morning_vs_evening.rows[1].value),
      checkins: cards.morning_vs_evening.entries,
    },
    training_vs_rest: cards.training_vs_rest && {
      next_day_pain_after_rest: round(cards.training_vs_rest.rows[0].value),
      next_day_pain_after_training: round(cards.training_vs_rest.rows[1].value),
      days: cards.training_vs_rest.entries,
    },
  };
}
