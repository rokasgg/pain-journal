import type {
  CheckinDepthPreference,
  InjuryOnsetPeriod,
  PainRadiates,
  PrimaryGoal,
  WorstTimeOfDay,
} from '@/types/database.types';

export const ONBOARDING_TOTAL_STEPS = 6;

// Broad, one-level body regions for onboarding's "which areas hurt?" step —
// deliberately not clinical muscle-level detail (physio visit logging no
// longer collects that either — see CLAUDE.md's Pain/Neck Tracker Domain
// section). Onboarding just needs a quick, flat multi-select.
export const PAIN_LOCATION_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'neck', labelKey: 'onboarding.locationNeck' },
  { value: 'shoulders_upper_back', labelKey: 'onboarding.locationShouldersUpperBack' },
  { value: 'lower_back', labelKey: 'onboarding.locationLowerBack' },
  { value: 'hips_glutes', labelKey: 'onboarding.locationHipsGlutes' },
  { value: 'arms', labelKey: 'onboarding.locationArms' },
  { value: 'legs', labelKey: 'onboarding.locationLegs' },
  { value: 'head', labelKey: 'onboarding.locationHead' },
  { value: 'other', labelKey: 'common.other' },
];

export const INJURY_ONSET_PERIOD_OPTIONS: { value: InjuryOnsetPeriod; labelKey: string }[] = [
  { value: 'this_week', labelKey: 'onboarding.onsetThisWeek' },
  { value: 'month_ago', labelKey: 'onboarding.onsetMonthAgo' },
  { value: 'months_ago', labelKey: 'onboarding.onsetMonthsAgo' },
  { value: 'year_plus', labelKey: 'onboarding.onsetYearPlus' },
  { value: 'unknown', labelKey: 'onboarding.onsetUnknown' },
];

export const PAIN_CHARACTER_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'sharp', labelKey: 'onboarding.characterSharp' },
  { value: 'dull', labelKey: 'onboarding.characterDull' },
  { value: 'burning', labelKey: 'onboarding.characterBurning' },
  { value: 'tingling', labelKey: 'onboarding.characterTingling' },
  { value: 'spasming', labelKey: 'onboarding.characterSpasming' },
];

export const PAIN_RADIATES_OPTIONS: { value: PainRadiates; labelKey: string }[] = [
  { value: 'yes', labelKey: 'common.yes' },
  { value: 'no', labelKey: 'common.no' },
  { value: 'sometimes', labelKey: 'onboarding.sometimes' },
];

export const WORST_TIME_OF_DAY_OPTIONS: { value: WorstTimeOfDay; labelKey: string; descriptionKey?: string }[] = [
  { value: 'morning', labelKey: 'onboarding.worstTimeMorning' },
  { value: 'evening', labelKey: 'onboarding.worstTimeEvening' },
  { value: 'after_activity', labelKey: 'onboarding.worstTimeAfterActivity' },
  { value: 'no_pattern', labelKey: 'onboarding.worstTimeNoPattern' },
];

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; labelKey: string }[] = [
  { value: 'track_progress', labelKey: 'onboarding.goalTrackProgress' },
  { value: 'identify_triggers', labelKey: 'onboarding.goalIdentifyTriggers' },
  { value: 'prepare_for_appointments', labelKey: 'onboarding.goalPrepareForAppointments' },
  { value: 'track_exercises', labelKey: 'onboarding.goalTrackExercises' },
  { value: 'just_journal', labelKey: 'onboarding.goalJustJournal' },
];

export const CHECKIN_DEPTH_OPTIONS: { value: CheckinDepthPreference; labelKey: string }[] = [
  { value: 'quick', labelKey: 'onboarding.depthQuick' },
  { value: 'detailed', labelKey: 'onboarding.depthDetailed' },
  { value: 'varies', labelKey: 'onboarding.depthVaries' },
];
