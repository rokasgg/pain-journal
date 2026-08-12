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

export interface FlareUp {
  id: string;
  user_id: string;
  occurred_at: string;
  pain_level: number;
  likely_cause: string | null;
  description: string | null;
  created_at: string;
}

export type FlareUpInsert = Omit<FlareUp, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type MuscleStatus = 'weak' | 'tight' | 'normal' | 'improving';

export interface PhysioAssessment {
  id: string;
  user_id: string;
  visit_date: string;
  physio_name: string | null;
  overall_notes: string | null;
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
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<Profile, 'full_name' | 'injury_started_on' | 'injury_description' | 'healing_started_on'>
>;
