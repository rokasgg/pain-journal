/**
 * Seeds a test account with realistic, patterned data.
 *
 *   npx tsx --env-file=.env.seed scripts/seed-test-user.ts [options]
 *
 * Options:
 *   --email <addr>     default seed+year@example.com (must contain "+seed" or end in @example.com)
 *   --password <pw>    default PainJournal123!
 *   --days <n>         logged history length, default 365 (try 2, 6, 13 to sit just before an unlock)
 *   --free             no Premium subscription row
 *   --seed <n>         random seed, default 42 (same seed = same data)
 *
 * .env.seed (git-ignored) needs:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...      (Dashboard → Project Settings → API; never put it in .env)
 *
 * Re-running with the same email deletes that user and all their rows first.
 *
 * The data has patterns built in so Insights has something to find:
 *  - pain eases over the period (progress since you started)
 *  - short / poor sleep → higher morning pain
 *  - stressful days → higher evening pain
 *  - late screens + short sleep → flare-ups are more likely the next day
 *  - training days → lower pain the next day, and pain_after < pain_before
 * Today is left empty (so you can test a check-in), yesterday evening is missing
 * (late logging), and one flare-up from yesterday is still ongoing (the morning
 * follow-up step).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { addDays, format, subDays } from 'date-fns';
import type {
  CheckinInsert,
  CompletedExercise,
  ExerciseLogInsert,
  FlareUpInsert,
  PhysioQuestion,
  RoutineExercise,
} from '../src/types/database.types';

// ---------- args / env ----------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const EMAIL = arg('email') ?? 'seed+year@example.com';
const PASSWORD = arg('password') ?? 'PainJournal123!';
const DAYS = Math.max(0, Number(arg('days') ?? 365));
const PREMIUM = !flag('free');
const SEED = Number(arg('seed') ?? 42);

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (put them in .env.seed).');
  process.exit(1);
}
if (!/\+seed|@example\.com$/i.test(EMAIL)) {
  console.error(`Refusing to seed "${EMAIL}": test emails must contain "+seed" or end in @example.com.`);
  process.exit(1);
}

// Node 20 has no global WebSocket, and supabase-js throws at createClient()
// without one. This script never uses realtime, so a stub that is never opened
// is enough (no `ws` dependency needed).
class NoRealtimeSocket {
  constructor() {
    throw new Error('Realtime is not used by the seed script');
  }
}

const db: SupabaseClient = createClient(SUPABASE_URL as string, SERVICE_KEY as string, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: NoRealtimeSocket as unknown as typeof WebSocket },
});

// ---------- deterministic randomness ----------

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const chance = (p: number) => rand() < p;
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const noise = (sd: number) => (rand() + rand() + rand() - 1.5) * sd * 1.4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v);

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
function at(day: Date, hour: number, minute = 0): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}
const iso = (d: Date) => d.toISOString();

// ---------- reset ----------

const USER_TABLES = [
  'experiment_days',
  'experiments',
  'exercise_logs',
  'routines',
  'physio_assessments',
  'flare_ups',
  'checkins',
  'reminder_settings',
  'subscriptions',
  'ai_usage',
] as const;

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function deleteUser(userId: string) {
  for (const table of USER_TABLES) {
    const { error } = await db.from(table).delete().eq('user_id', userId);
    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      throw new Error(`delete ${table}: ${error.message}`);
    }
  }
  await db.from('profiles').delete().eq('id', userId);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
}

async function insertChunked(table: string, rows: object[], chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await db.from(table).insert(rows.slice(i, i + chunk), { defaultToNull: false });
    if (error) throw new Error(`insert ${table}: ${error.message} (${error.code})`);
  }
}

// ---------- static content ----------

const ROUTINE_A: RoutineExercise[] = [
  {
    id: 'ex_1',
    name: 'Chin tucks',
    muscle_group: 'Deep neck flexors',
    target_sets_reps: '3 × 10, hold 5 s',
    instructions: 'Sit tall, gently draw the chin straight back without tilting the head.',
    caution_notes: 'Stop if it causes tingling in the arms.',
  },
  {
    id: 'ex_2',
    name: 'Scapular retractions',
    muscle_group: 'Rhomboids / mid trapezius',
    target_sets_reps: '3 × 12',
    instructions: 'Squeeze the shoulder blades together and down, hold 3 s.',
    caution_notes: 'Keep the neck relaxed.',
  },
  {
    id: 'ex_3',
    name: 'Upper trapezius stretch',
    muscle_group: 'Upper trapezius',
    target_sets_reps: '2 × 30 s each side',
    instructions: 'Tilt the ear towards the shoulder, light hand pressure only.',
    caution_notes: 'Gentle stretch, never pain.',
  },
  {
    id: 'ex_4',
    name: 'Thoracic extension over chair',
    muscle_group: 'Thoracic spine',
    target_sets_reps: '2 × 8',
    instructions: 'Hands behind the head, extend over the chair back, return slowly.',
    caution_notes: '',
  },
];

const ROUTINE_B: RoutineExercise[] = [
  {
    id: 'ex_1',
    name: 'Band pull-aparts',
    muscle_group: 'Rear deltoids',
    target_sets_reps: '3 × 15',
    instructions: 'Arms straight in front, pull the band apart to chest level.',
    caution_notes: 'Light band to start.',
  },
  {
    id: 'ex_2',
    name: 'Prone Y raises',
    muscle_group: 'Lower trapezius',
    target_sets_reps: '3 × 10',
    instructions: 'Lying face down, lift arms in a Y shape, thumbs up.',
    caution_notes: 'Do not shrug.',
  },
  {
    id: 'ex_3',
    name: 'Levator scapulae stretch',
    muscle_group: 'Levator scapulae',
    target_sets_reps: '2 × 30 s each side',
    instructions: 'Look towards the armpit, gentle hand pressure on the back of the head.',
    caution_notes: '',
  },
];

const MORNING_NOTES = [
  'Woke up stiff, eased after a shower.',
  'Pillow felt too high.',
  'Slept badly, neighbours were loud.',
  'Feeling better than yesterday.',
  'Neck clicked when turning left.',
];
const EVENING_NOTES = [
  'Long meeting day, shoulders tight by 17:00.',
  'Good walk at lunch helped.',
  'Drove for two hours, neck sore after.',
  'Calm day, barely noticed the pain.',
  'Worked on the laptop on the sofa — bad idea.',
];

// ---------- generation ----------

interface DayState {
  date: Date;
  sleepHours: number;
  sleepQuality: number;
  stress: number;
  screen: number; // 1/3/5/7/9 bucket values
  steps: number;
  activity: number;
  trained: boolean;
  morningPain: number;
  eveningPain: number;
  flare: boolean;
}

async function main() {
  const today = at(new Date(), 12);
  const firstDay = subDays(today, DAYS); // DAYS logged days, ending yesterday
  console.log(`Seeding ${EMAIL}: ${DAYS} days, ${PREMIUM ? 'Premium' : 'Free'}, seed ${SEED}`);

  const existing = await findUserId(EMAIL);
  if (existing) {
    console.log('  deleting existing user…');
    await deleteUser(existing);
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Test Seed' },
  });
  if (createError || !created.user) throw createError ?? new Error('createUser returned no user');
  const userId = created.user.id;

  // ---- profile ----
  const injuryStart = subDays(firstDay, 21);
  const { error: profileError } = await db.from('profiles').upsert({
    id: userId,
    full_name: 'Test Seed',
    onboarding_completed: true,
    injury_started_on: ymd(injuryStart),
    injury_started_approx: false,
    injury_description: 'Neck and upper back pain after a long period of desk work. C5–C6 irritation.',
    healing_started_on: ymd(subDays(firstDay, 7)),
    pain_locations: ['neck', 'shoulders_upper_back'],
    pain_character: ['dull', 'sharp'],
    worst_time_of_day: 'morning',
    primary_goal: 'both',
    checkin_depth_preference: 'detailed',
    ai_insights_enabled: true,
    weekly_training_goal: 3,
    care_status: 'with_professional',
    care_status_answered_at: iso(subDays(today, Math.max(0, DAYS - 7))),
    training_enabled: DAYS >= 60,
    diagnosis_status: 'yes',
    diagnosis_text: 'Cervical facet joint irritation (C5–C6)',
    diagnosed_by: 'physio',
    diagnosed_on: ymd(subDays(firstDay, 10)),
    work_type: 'sitting',
    work_hours: '8_plus',
    life_stress: 'moderate',
    exercise_frequency: 'weekly_1_2',
    suspected_triggers: ['Desk work', 'Poor sleep', 'Stress'],
  });
  if (profileError) throw new Error(`profile: ${profileError.message}`);

  await db.from('reminder_settings').upsert({
    user_id: userId,
    morning_time: '08:00',
    evening_time: '21:00',
    timezone: 'Europe/Vilnius',
    push_enabled: true,
  });

  if (PREMIUM) {
    const { error } = await db.from('subscriptions').upsert({
      user_id: userId,
      entitlement: 'pain_journaling_pro',
      product_id: 'yearly',
      period_type: 'normal',
      expires_at: iso(addDays(today, 365)),
      will_renew: true,
    });
    if (error) console.warn(`  subscriptions skipped: ${error.message}`);
  }

  // ---- routines + physio visits (only once there's enough history) ----
  const routineStartIdx = 45;
  let routineIds: { id: string; exercises: RoutineExercise[] }[] = [];
  const visitIds: string[] = [];

  if (DAYS > 30) {
    const visits: { visit_date: string; next_visit_date: string | null; overall_notes: string; questions: PhysioQuestion[] }[] = [];
    for (let i = 20; i < DAYS; i += int(28, 42)) {
      const date = addDays(firstDay, i);
      visits.push({
        visit_date: ymd(date),
        next_visit_date: ymd(addDays(date, 35)),
        overall_notes: pick([
          'Worked on upper trapezius and levator scapulae. Mobility C5–C6 improved. Keep chin tucks daily.',
          'Soft tissue on the left side, thoracic mobilisation. Posture advice for the desk.',
          'Reassessed range of motion: rotation left better. Progressed band exercises.',
        ]),
        questions: [
          { id: `q${i}a`, text: 'Should I use heat or ice after a flare-up?', discussed: true, answer: 'Heat for stiffness, short walks.', created_before_visit: true },
          { id: `q${i}b`, text: 'Is it OK to go to the gym?', discussed: false, answer: null, created_before_visit: true },
        ],
      });
    }
    // Make the latest visit's next date overdue → "Did your visit happen?" banner.
    if (visits.length) {
      const last = visits[visits.length - 1];
      last.next_visit_date = ymd(subDays(today, 3));
    }
    const { data, error } = await db
      .from('physio_assessments')
      .insert(visits.map((v) => ({ ...v, user_id: userId, physio_name: 'Rūta (physio)' })))
      .select('id, visit_date');
    if (error) console.warn(`  physio_assessments skipped: ${error.message}`);
    else visitIds.push(...data.map((r) => r.id as string));
  }

  if (DAYS > routineStartIdx) {
    const created = addDays(firstDay, routineStartIdx);
    const { data, error } = await db
      .from('routines')
      .insert([
        { user_id: userId, title: 'Neck & posture — Day A', exercises: ROUTINE_A, in_rotation: true, physio_visit_id: visitIds[0] ?? null, created_at: iso(at(created, 18)) },
        { user_id: userId, title: 'Shoulder blades — Day B', exercises: ROUTINE_B, in_rotation: true, physio_visit_id: visitIds[1] ?? null, created_at: iso(at(addDays(created, 40), 18)) },
      ])
      .select('id, exercises');
    if (error) console.warn(`  routines skipped: ${error.message}`);
    else routineIds = data.map((r) => ({ id: r.id as string, exercises: r.exercises as RoutineExercise[] }));
  }

  // ---- experiment window (finished, ~4 months ago) ----
  const expLen = 14;
  const expStartIdx = DAYS >= 160 ? DAYS - 130 : -1;

  // ---- day-by-day simulation ----
  const days: DayState[] = [];
  const morningRows: CheckinInsert[] = [];
  const eveningRows: CheckinInsert[] = [];
  const flareRows: FlareUpInsert[] = [];
  const logRows: ExerciseLogInsert[] = [];
  const expDays: { date: string; followed: boolean }[] = [];

  let flareAfterglow = 0; // extra pain for days after a flare-up
  // A vacation gap of ~6 days roughly in the middle of a long history.
  const gapStart = DAYS > 120 ? Math.floor(DAYS * 0.55) : -1;

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(firstDay, i);
    const prev = days[i - 1];
    const progress = DAYS > 1 ? i / (DAYS - 1) : 0;
    const weekday = date.getDay(); // 0 Sun
    const workday = weekday >= 1 && weekday <= 5;
    const inExperiment = expStartIdx >= 0 && i >= expStartIdx && i < expStartIdx + expLen;
    const followedExperiment = inExperiment && chance(0.8);

    const baseline = 6.2 - 3.6 * progress; // 6.2 → 2.6 over the period

    // Last night (logged on this morning)
    const sleepHours = clamp(Math.round((7.1 + noise(0.8) - (prev && prev.screen >= 7 ? 0.6 : 0)) * 2) / 2, 4.5, 9.5);
    const sleepQuality = round(clamp(5.5 + (sleepHours - 7) * 1.4 + noise(1.2) - (prev && prev.stress >= 3 ? 0.8 : 0), 1, 10));

    // Today's day
    const stress = clamp(round((workday ? 2.3 : 1.5) + noise(0.8)), 1, 4);
    let screen = pick(workday ? [3, 5, 5, 7, 7, 9] : [1, 3, 3, 5, 7]);
    if (followedExperiment) screen = pick([1, 3]);
    const routineAvailable = routineIds.length > 0 && i >= routineStartIdx;
    const trained = routineAvailable && chance(0.45);
    const otherExercise = chance(0.4) ? pick(['Walking', 'Walking', 'Cycling', 'Swimming', 'Gym']) : null;
    const steps = Math.round(clamp(6500 + noise(2800) + (otherExercise === 'Walking' ? 3500 : 0), 1500, 19000) / 10) * 10;
    const activity = round(clamp(4 + (steps - 6500) / 2000 + (trained ? 1.5 : 0) + noise(1), 1, 10));

    // Pain
    const morningPain =
      baseline +
      (7 - sleepHours) * 0.7 +
      (sleepQuality <= 4 ? 0.8 : 0) +
      (prev?.trained ? -0.7 : 0) +
      (prev && prev.steps > 9000 ? -0.4 : 0) +
      (prev ? (prev.screen - 5) * 0.12 : 0) +
      flareAfterglow +
      0.4 + // mornings a bit worse (worst_time_of_day: morning)
      noise(0.9);
    const eveningPain = baseline + (stress - 2) * 0.9 + (workday ? 0.3 : -0.3) + flareAfterglow * 0.7 + noise(0.9);

    // Flare-up: more likely after a short night with late screens, or a very stressful day.
    const riskyLeadUp = sleepHours < 6.5 && (prev?.screen ?? 0) >= 7;
    const flareP = 0.025 + (riskyLeadUp ? 0.22 : 0) + (stress === 4 ? 0.08 : 0) - progress * 0.015;
    const flare = chance(flareP);

    flareAfterglow = flare ? 2 : Math.max(0, flareAfterglow - 0.8);

    const state: DayState = { date, sleepHours, sleepQuality, stress, screen, steps, activity, trained, morningPain, eveningPain, flare };
    days.push(state);

    if (inExperiment) expDays.push({ date: ymd(date), followed: followedExperiment });

    // ---- what actually got logged ----
    const inGap = gapStart >= 0 && i >= gapStart && i < gapStart + 6;
    const isYesterday = i === DAYS - 1;
    const logMorning = !inGap && (i < 3 ? true : chance(0.9));
    const logEvening = !inGap && !isYesterday && (i < 3 ? true : chance(0.86));
    const lateLogged = (when: Date) => (i >= DAYS - 2 ? false : chance(0.03)) ? { logged_late: true, logged_at: iso(addDays(when, 1)) } : {};

    if (logMorning) {
      const pain = round(clamp(morningPain, 0, 10));
      const inPain = pain >= 1;
      const stiffness = round(clamp(pain + 1 + noise(1), 1, 10));
      const symptoms: CheckinInsert['symptoms'] = inPain
        ? {
            pain_areas: pick([['Neck'], ['Neck', 'Shoulders'], ['Neck', 'Between shoulder blades'], ['Upper back']]),
            ...(pain >= 6 && chance(0.4) ? { tingling: true } : {}),
            ...(pain >= 5 && chance(0.3) ? { headache: true } : {}),
          }
        : {};
      const when = at(date, 7, int(5, 55));
      const positions = pick([['side'], ['side'], ['back'], ['side', 'back'], ['stomach']]);
      morningRows.push({
        user_id: userId,
        type: 'morning',
        checkin_date: ymd(date),
        pain_level: pain,
        woke_up_with_pain: inPain,
        stiffness_level: stiffness,
        range_of_motion: round(clamp(10 - stiffness * 0.7 + noise(1), 1, 10)),
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        sleep_position: positions[0],
        sleep_positions: positions,
        symptoms,
        triggers: inPain ? [...(sleepQuality <= 4 ? ['Poor sleep'] : []), ...(chance(0.2) ? ['Poor posture'] : [])] : [],
        notes: chance(0.12) ? pick(MORNING_NOTES) : null,
        exercise_types: [],
        health_workouts: [],
        created_at: iso(when),
        updated_at: iso(when),
        ...lateLogged(when),
      });
    }

    if (logEvening) {
      const pain = round(clamp(eveningPain, 0, 10));
      const inPain = pain >= 1;
      const stiffness = round(clamp(pain + noise(1), 1, 10));
      const when = at(date, 21, int(0, 50));
      const types = otherExercise ? [otherExercise] : [];
      eveningRows.push({
        user_id: userId,
        type: 'evening',
        checkin_date: ymd(date),
        pain_level: pain,
        stiffness_level: stiffness,
        range_of_motion: round(clamp(10 - stiffness * 0.6 + noise(1), 1, 10)),
        activity_level: activity,
        screen_time_hours: screen,
        stress_level: stress,
        did_exercises: otherExercise !== null,
        exercise_types: types,
        steps,
        health_workouts: types.map((type) => ({ type, minutes: int(20, 70), source: 'Apple Watch' })),
        symptoms: inPain ? { pain_areas: pick([['Neck'], ['Neck', 'Shoulders'], ['Shoulders']]) } : {},
        triggers: [],
        sleep_positions: [],
        notes: chance(0.15) ? pick(EVENING_NOTES) : null,
        created_at: iso(when),
        updated_at: iso(when),
        ...lateLogged(when),
      });
    }

    if (flare && !isYesterday) {
      const occurred = at(date, pick([9, 11, 14, 16, 18, 20]), int(0, 59));
      const triggers = [
        ...(riskyLeadUp ? ['Poor sleep'] : []),
        ...(stress >= 3 ? ['Stress'] : []),
        ...(workday && chance(0.5) ? ['Desk work'] : []),
      ];
      const finalTriggers = triggers.length ? triggers : [pick(['Long drive', 'Cold weather', 'Heavy lifting', 'Unknown'])];
      flareRows.push({
        user_id: userId,
        occurred_at: iso(occurred),
        pain_level: int(6, 9),
        pain_areas: pick([['Neck'], ['Neck', 'Shoulders'], ['Neck', 'Head'], ['Between shoulder blades']]),
        symptoms: chance(0.3) ? ['Headache'] : [],
        triggers: finalTriggers,
        likely_cause: finalTriggers.join(', '),
        description: chance(0.4) ? 'Sharp pain turning the head, had to stop working.' : null,
        status: 'resolved',
        status_updated_at: iso(addDays(occurred, 1)),
        resolved_duration_minutes: int(90, 1800),
        created_at: iso(occurred),
      });
    }

    if (trained) {
      const routine = pick(routineIds);
      const before = round(clamp(eveningPain + noise(0.5), 1, 9));
      const after = round(clamp(before - between(0.5, 2.2), 0, 9));
      const completed: CompletedExercise[] = routine.exercises.map((ex) => {
        const done = chance(0.9);
        const discomfort = done ? round(clamp(3.5 - 2 * progress + noise(1.2), 0, 8)) : 0;
        return { exercise_id: ex.id, completed: done, pain_discomfort_level: discomfort, flagged_pain: done && discomfort >= 5, note: null };
      });
      const doneCount = completed.filter((c) => c.completed).length;
      logRows.push({
        user_id: userId,
        routine_id: routine.id,
        logged_at: iso(at(date, 18, int(0, 59))),
        status: doneCount === 0 ? 'SKIPPED' : doneCount === completed.length ? 'FULL' : 'PARTIAL',
        completed_exercises: completed,
        general_note: null,
        pain_before: before,
        pain_after: after,
      });
    }
  }

  // One flare-up from yesterday evening, still ongoing → morning follow-up step.
  if (DAYS >= 1) {
    const occurred = at(subDays(today, 1), 19, 20);
    flareRows.push({
      user_id: userId,
      occurred_at: iso(occurred),
      pain_level: 7,
      pain_areas: ['Neck', 'Shoulders'],
      symptoms: [],
      triggers: ['Desk work', 'Stress'],
      likely_cause: 'Desk work, Stress',
      description: 'Came on after a long call.',
      status: 'ongoing',
      status_updated_at: iso(occurred),
      created_at: iso(occurred),
    });
  }

  await insertChunked('checkins', morningRows);
  await insertChunked('checkins', eveningRows);
  await insertChunked('flare_ups', flareRows);
  if (logRows.length) await insertChunked('exercise_logs', logRows);

  if (expStartIdx >= 0) {
    const { data, error } = await db
      .from('experiments')
      .insert({ user_id: userId, template: 'noScreensLate', started_on: expDays[0].date, length_days: expLen, status: 'done' })
      .select('id')
      .single();
    if (error) console.warn(`  experiments skipped: ${error.message}`);
    else await insertChunked('experiment_days', expDays.map((d) => ({ ...d, experiment_id: data.id, user_id: userId })));
  }

  console.log(
    [
      '',
      `✓ Done. Sign in with:`,
      `    ${EMAIL}`,
      `    ${PASSWORD}`,
      '',
      `  ${morningRows.length} morning + ${eveningRows.length} evening check-ins`,
      `  ${flareRows.length} flare-ups (1 ongoing), ${logRows.length} training sessions`,
      `  ${visitIds.length} physio visits, ${routineIds.length} routines, ${expStartIdx >= 0 ? 1 : 0} experiment`,
    ].join('\n'),
  );
}

main().catch((e: unknown) => {
  console.error('\n✗ Seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
