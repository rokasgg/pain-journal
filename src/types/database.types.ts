export type CheckinType = 'morning' | 'evening';

export type SleepPosition = 'back' | 'side' | 'stomach';

export interface CheckinSymptoms {
  tingling?: boolean;
  numbness?: boolean;
  weakness?: boolean;
  headache?: boolean;
  dizziness?: boolean;
  radiating_to?: string;
  custom?: string[];
  pain_areas?: string[];
}

// One workout read from Apple Health (any app that writes there: Strava,
// Apple Watch, Garmin…). `type` is an EXERCISE_TYPE_OPTIONS value or a stable
// English name for other activities.
export interface HealthWorkout {
  type: string;
  minutes: number;
  source: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  type: CheckinType;
  checkin_date: string;

  pain_level: number;
  stiffness_level: number | null;
  range_of_motion: number | null;

  sleep_quality: number | null;
  sleep_hours: number | null;
  woke_up_with_pain: boolean | null;
  sleep_position: SleepPosition | null;
  // supabase_checkin_redesign_migration.sql — several allowed.
  sleep_positions: string[];

  activity_level: number | null;
  screen_time_hours: number | null;
  // supabase_profile_lifestyle_migration.sql — evening "How stressful was
  // your day?": 1 calm · 2 normal · 3 stressful · 4 very stressful. Optional
  // so rows fetched before the migration still type-check.
  stress_level?: number | null;
  did_exercises: boolean | null;
  // supabase_checkin_redesign_migration.sql — "Kita fizinė veikla" chips.
  exercise_types: string[];
  exercise_notes: string | null;
  exercise_hours: number | null;
  exercise_intensity: number | null;
  // supabase_health_activity_migration.sql — from Apple Health, evening only.
  steps: number | null;
  health_workouts: HealthWorkout[];

  symptoms: CheckinSymptoms;
  triggers: string[];
  notes: string | null;

  // Added later from the History calendar (supabase_late_logging_migration.sql).
  logged_late: boolean;
  // When a late entry was actually entered; null for on-time check-ins.
  logged_at: string | null;

  created_at: string;
  updated_at: string;
}

// Morning-only and evening-only columns are always present in a select result
// (null when not relevant), but a single insert only ever supplies one side —
// so those columns are optional here even though `Checkin` has them required.
export type CheckinInsert = Omit<
  Checkin,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'checkin_date'
  | 'sleep_quality'
  | 'sleep_hours'
  | 'woke_up_with_pain'
  | 'sleep_position'
  | 'sleep_positions'
  | 'activity_level'
  | 'screen_time_hours'
  | 'did_exercises'
  | 'exercise_types'
  | 'exercise_notes'
  | 'exercise_hours'
  | 'exercise_intensity'
  | 'steps'
  | 'health_workouts'
  | 'logged_late'
  | 'logged_at'
> & {
  id?: string;
  logged_late?: boolean;
  logged_at?: string | null;
  checkin_date?: string;
  created_at?: string;
  updated_at?: string;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  woke_up_with_pain?: boolean | null;
  sleep_position?: string | null;
  sleep_positions?: string[];
  activity_level?: number | null;
  screen_time_hours?: number | null;
  did_exercises?: boolean | null;
  exercise_types?: string[];
  exercise_notes?: string | null;
  exercise_hours?: number | null;
  exercise_intensity?: number | null;
  steps?: number | null;
  health_workouts?: HealthWorkout[];
};

export type FlareUpStatus = 'resolved' | 'ongoing' | 'unknown';

export interface FlareUp {
  id: string;
  user_id: string;
  occurred_at: string;
  pain_level: number;
  likely_cause: string | null;
  description: string | null;
  // supabase_flare_up_details_migration.sql — stable English identifiers or
  // custom text, like checkins.triggers. likely_cause mirrors `triggers`.
  pain_areas: string[];
  symptoms: string[];
  triggers: string[];
  status: FlareUpStatus;
  status_updated_at: string;
  resolved_duration_minutes: number | null;
  resolution_note: string | null;
  created_at: string;
}

export type FlareUpInsert = Omit<
  FlareUp,
  'id' | 'created_at' | 'status_updated_at' | 'resolved_duration_minutes' | 'resolution_note'
> & {
  id?: string;
  created_at?: string;
  status_updated_at?: string;
  resolved_duration_minutes?: number | null;
  resolution_note?: string | null;
};

export type MuscleStatus = 'weak' | 'tight' | 'normal' | 'improving';

// supabase_experiments_migration.sql — Insights → Experiments.
export type ExperimentStatus = 'active' | 'done' | 'stopped';

export interface Experiment {
  id: string;
  user_id: string;
  // A template id from src/constants/experiments.ts, or 'custom'.
  template: string;
  custom_title: string | null;
  started_on: string; // yyyy-MM-dd
  length_days: number;
  status: ExperimentStatus;
  ended_on: string | null; // set when stopped early
  created_at: string;
}

export interface ExperimentDay {
  id: string;
  experiment_id: string;
  user_id: string;
  date: string; // yyyy-MM-dd
  followed: boolean;
  created_at: string;
}

export interface PhysioQuestion {
  id: string;
  text: string;
  discussed: boolean;
  answer: string | null;
  // Whether this question was drafted on the pre-visit screen (carried over
  // from a past visit, or an AI suggestion) vs. added while wrapping up this
  // visit's own notes step.
  created_before_visit: boolean;
}

export interface PhysioAssessment {
  id: string;
  user_id: string;
  visit_date: string;
  physio_name: string | null;
  overall_notes: string | null;
  next_visit_date: string | null;
  questions: PhysioQuestion[];
  created_at: string;
  muscle_findings?: MuscleFinding[];
}

export type PhysioAssessmentInsert = Omit<PhysioAssessment, 'id' | 'user_id' | 'created_at' | 'muscle_findings'>;

export interface MuscleFinding {
  id: string;
  assessment_id: string;
  muscle_name: string;
  status: MuscleStatus;
  side: string | null;
  severity: number | null;
  notes: string | null;
}

export type MuscleFindingInsert = Omit<MuscleFinding, 'id' | 'assessment_id'>;

// Premium entitlement (supabase_premium_migration.sql). Read-only for the
// client: only the revenuecat-webhook edge function (service role) writes it.
export interface Subscription {
  user_id: string;
  entitlement: string;
  product_id: string | null;
  period_type: 'trial' | 'intro' | 'normal' | null;
  expires_at: string | null;
  will_renew: boolean;
  updated_at: string;
}

export interface ReminderSettings {
  user_id: string;
  morning_time: string;
  evening_time: string;
  timezone: string;
  push_enabled: boolean;
  updated_at: string;
}

export type ReminderSettingsUpsert = Partial<Omit<ReminderSettings, 'user_id' | 'updated_at'>> & {
  user_id: string;
};

export type InjuryOnsetPeriod = 'this_week' | 'month_ago' | 'months_ago' | 'year_plus' | 'unknown';
export type PainRadiates = 'yes' | 'no' | 'sometimes';
export type WorstTimeOfDay = 'morning' | 'evening' | 'after_activity' | 'no_pattern';
// What the user wants from the app (onboarding step 0). The first three are
// current; the rest are older answers, still read: identify_triggers counts as
// understand_pain and track_progress as track_recovery (src/lib/profileAnswers.ts).
export type PrimaryGoal =
  | 'track_recovery'
  | 'understand_pain'
  | 'both'
  | 'track_progress'
  | 'identify_triggers'
  | 'prepare_for_appointments'
  | 'track_exercises'
  | 'just_journal';
export type CheckinDepthPreference = 'quick' | 'detailed' | 'varies';
export type DiagnosisStatus = 'yes' | 'not_yet' | 'unsure';
export type DiagnosedBy = 'family_doctor' | 'specialist' | 'physio' | 'chiropractor' | 'other';
export type WorkType = 'sitting' | 'standing' | 'physical' | 'mixed' | 'not_working';
export type WorkHours = 'under_4' | '4_6' | '6_8' | '8_plus';
export type LifeStress = 'low' | 'moderate' | 'high';
export type ExerciseFrequency = 'rarely' | 'weekly_1_2' | 'weekly_3_plus';
// Answer to the journey's day-7 care step (supabase_journey_migration.sql).
export type CareStatus = 'with_professional' | 'not_yet' | 'just_tracking';

export interface Profile {
  id: string;
  full_name: string | null;
  injury_started_on: string | null;
  injury_description: string | null;
  healing_started_on: string | null;
  last_pattern_analysis: string | null;
  last_pattern_analysis_at: string | null;
  last_physio_summary: string | null;
  last_physio_summary_at: string | null;
  last_physio_focus_summary: string | null;
  last_physio_focus_summary_at: string | null;

  // Onboarding wizard answers — see src/app/onboarding.tsx.
  onboarding_completed: boolean;
  pain_locations: string[];
  pain_character: string[];
  pain_radiates: PainRadiates | null;
  worst_time_of_day: WorstTimeOfDay | null;
  primary_goal: PrimaryGoal | null;
  checkin_depth_preference: CheckinDepthPreference | null;
  ai_insights_enabled: boolean;
  // Sessions per week for the Home weekly-goal card (1-7, DB default 3).
  // Optional so profiles fetched before supabase_training_payoff_migration.sql
  // ran still type-check — read it as `profile?.weekly_training_goal ?? 3`.
  weekly_training_goal?: number;
  // New-user journey (supabase_journey_migration.sql) — optional so profiles
  // fetched before the migration still type-check.
  care_status?: CareStatus | null;
  care_status_answered_at?: string | null;
  // null/undefined = not decided; see resolveTrainingEnabled() in lib/journey.ts.
  training_enabled?: boolean | null;

  // supabase_profile_lifestyle_migration.sql — optional so profiles fetched
  // before it ran still type-check.
  // true when injury_started_on came from a rough period ("about").
  injury_started_approx?: boolean;
  // The professional's diagnosis, recorded as the user was told it. The app
  // never suggests or changes one.
  diagnosis_status?: DiagnosisStatus | null;
  diagnosis_text?: string | null;
  diagnosed_by?: DiagnosedBy | null;
  diagnosed_on?: string | null;
  diagnosis_notes?: string | null;
  // "About me": usual day-to-day (not daily values — see checkins.stress_level).
  work_type?: WorkType | null;
  work_hours?: WorkHours | null;
  life_stress?: LifeStress | null;
  exercise_frequency?: ExerciseFrequency | null;
  // The user's own hunches about what makes it worse — checked, never assumed.
  suspected_triggers?: string[];

  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'injury_started_on'
    | 'injury_description'
    | 'healing_started_on'
    | 'onboarding_completed'
    | 'pain_locations'
    | 'pain_character'
    | 'pain_radiates'
    | 'worst_time_of_day'
    | 'primary_goal'
    | 'checkin_depth_preference'
    | 'ai_insights_enabled'
    | 'weekly_training_goal'
    | 'care_status'
    | 'care_status_answered_at'
    | 'training_enabled'
    | 'injury_started_approx'
    | 'diagnosis_status'
    | 'diagnosis_text'
    | 'diagnosed_by'
    | 'diagnosed_on'
    | 'diagnosis_notes'
    | 'work_type'
    | 'work_hours'
    | 'life_stress'
    | 'exercise_frequency'
    | 'suspected_triggers'
  >
>;

// One exercise within a Routine's `exercises` jsonb array. `id` is a
// client-generated string (not a DB row id — exercises don't have their own
// table), used to match entries up with ExerciseLog.completed_exercises.
export interface RoutineExercise {
  id: string;
  name: string;
  muscle_group: string;
  target_sets_reps: string;
  instructions: string;
  caution_notes: string;
}

export interface Routine {
  id: string;
  user_id: string;
  // Set when generated from a physio visit; null when created from free
  // text/onboarding. FK target is `physio_assessments` in the DB (see
  // supabase_routines_migration.sql) — the app-level name for that table's
  // domain is "physio visit", hence this column's name.
  physio_visit_id: string | null;
  title: string;
  // Any number of routines can be `in_rotation` at once (see
  // supabase_routines_migration_v2.sql) — the user manually picks which one
  // to train each day, e.g. alternating a physio's Day A / Day B routines.
  in_rotation: boolean;
  exercises: RoutineExercise[];
  created_at: string;
}
export type RoutineInsert = Omit<Routine, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ExerciseLogStatus = 'FULL' | 'PARTIAL' | 'SKIPPED';

// One exercise's outcome within an ExerciseLog's `completed_exercises` jsonb
// array. `exercise_id` matches a `RoutineExercise.id` from the routine this
// log is for. `pain_discomfort_level` is 0-10, enforced app-side only (same
// as every other 0-10 field in this schema, e.g. checkins.pain_level).
export interface CompletedExercise {
  exercise_id: string;
  completed: boolean;
  pain_discomfort_level: number;
  flagged_pain: boolean;
  note: string | null;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  routine_id: string;
  logged_at: string;
  status: ExerciseLogStatus;
  completed_exercises: CompletedExercise[];
  general_note: string | null;
  // Optional 0-10 pain right before / after the session (see
  // supabase_training_payoff_migration.sql) — powers "pain 5 → 3" and the
  // Insights "Is it working?" card.
  pain_before: number | null;
  pain_after: number | null;
}

export type ExerciseLogInsert = Omit<ExerciseLog, 'id' | 'logged_at'> & {
  id?: string;
  logged_at?: string;
};
