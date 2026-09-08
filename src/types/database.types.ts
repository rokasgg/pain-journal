export type CheckinType = 'morning' | 'evening';

export type SleepPosition = 'back' | 'side' | 'stomach';

export interface CheckinSymptoms {
  tingling?: boolean;
  numbness?: boolean;
  headache?: boolean;
  radiating_to?: string;
  custom?: string[];
  pain_areas?: string[];
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

  activity_level: number | null;
  screen_time_hours: number | null;
  did_exercises: boolean | null;
  exercise_notes: string | null;
  exercise_hours: number | null;
  exercise_intensity: number | null;

  symptoms: CheckinSymptoms;
  triggers: string[];
  notes: string | null;

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
  | 'activity_level'
  | 'screen_time_hours'
  | 'did_exercises'
  | 'exercise_notes'
  | 'exercise_hours'
  | 'exercise_intensity'
> & {
  id?: string;
  checkin_date?: string;
  created_at?: string;
  updated_at?: string;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  woke_up_with_pain?: boolean | null;
  sleep_position?: string | null;
  activity_level?: number | null;
  screen_time_hours?: number | null;
  did_exercises?: boolean | null;
  exercise_notes?: string | null;
  exercise_hours?: number | null;
  exercise_intensity?: number | null;
};

export type FlareUpStatus = 'resolved' | 'ongoing' | 'unknown';

export interface FlareUp {
  id: string;
  user_id: string;
  occurred_at: string;
  pain_level: number;
  likely_cause: string | null;
  description: string | null;
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
export type PrimaryGoal =
  | 'track_progress'
  | 'identify_triggers'
  | 'prepare_for_appointments'
  | 'track_exercises'
  | 'just_journal';
export type CheckinDepthPreference = 'quick' | 'detailed' | 'varies';

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
  injury_onset_date: string | null;
  injury_onset_period: InjuryOnsetPeriod | null;
  pain_locations: string[];
  pain_character: string[];
  pain_radiates: PainRadiates | null;
  worst_time_of_day: WorstTimeOfDay | null;
  primary_goal: PrimaryGoal | null;
  checkin_depth_preference: CheckinDepthPreference | null;
  ai_insights_enabled: boolean;

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
    | 'injury_onset_date'
    | 'injury_onset_period'
    | 'pain_locations'
    | 'pain_character'
    | 'pain_radiates'
    | 'worst_time_of_day'
    | 'primary_goal'
    | 'checkin_depth_preference'
    | 'ai_insights_enabled'
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
}

export type ExerciseLogInsert = Omit<ExerciseLog, 'id' | 'logged_at'> & {
  id?: string;
  logged_at?: string;
};
