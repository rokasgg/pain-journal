import type { Purpose } from '@/lib/profileAnswers';
import type {
  CheckinDepthPreference,
  DiagnosedBy,
  DiagnosisStatus,
  ExerciseFrequency,
  InjuryOnsetPeriod,
  LifeStress,
  PrimaryGoal,
  WorkHours,
  WorkType,
  WorstTimeOfDay,
} from '@/types/database.types';

export const ONBOARDING_TOTAL_STEPS = 9;

// Step 0: what the user wants from the app. Never "find out what's wrong":
// the app never diagnoses.
export const PURPOSE_OPTIONS: {
  value: PrimaryGoal & ('track_recovery' | 'understand_pain' | 'both');
  purpose: Purpose;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: 'track_recovery',
    purpose: 'recovery',
    labelKey: 'onboarding.purposeRecovery',
    descriptionKey: 'onboarding.purposeRecoveryDesc',
  },
  {
    value: 'understand_pain',
    purpose: 'understand',
    labelKey: 'onboarding.purposeUnderstand',
    descriptionKey: 'onboarding.purposeUnderstandDesc',
  },
  { value: 'both', purpose: 'both', labelKey: 'onboarding.purposeBoth', descriptionKey: 'onboarding.purposeBothDesc' },
];

export const DIAGNOSIS_STATUS_OPTIONS: { value: DiagnosisStatus; labelKey: string }[] = [
  { value: 'yes', labelKey: 'onboarding.diagnosisYes' },
  { value: 'not_yet', labelKey: 'onboarding.diagnosisNotYet' },
  { value: 'unsure', labelKey: 'onboarding.diagnosisUnsure' },
];

export const DIAGNOSED_BY_OPTIONS: { value: DiagnosedBy; labelKey: string }[] = [
  { value: 'family_doctor', labelKey: 'onboarding.byFamilyDoctor' },
  { value: 'specialist', labelKey: 'onboarding.bySpecialist' },
  { value: 'physio', labelKey: 'onboarding.byPhysio' },
  { value: 'chiropractor', labelKey: 'onboarding.byChiropractor' },
  { value: 'other', labelKey: 'common.other' },
];

export const WORK_TYPE_OPTIONS: { value: WorkType; labelKey: string }[] = [
  { value: 'sitting', labelKey: 'onboarding.workSitting' },
  { value: 'standing', labelKey: 'onboarding.workStanding' },
  { value: 'physical', labelKey: 'onboarding.workPhysical' },
  { value: 'mixed', labelKey: 'onboarding.workMixed' },
  { value: 'not_working', labelKey: 'onboarding.workNotWorking' },
];

// Asked only for sitting or standing work.
export const WORK_HOURS_OPTIONS: { value: WorkHours; labelKey: string }[] = [
  { value: 'under_4', labelKey: 'onboarding.hoursUnder4' },
  { value: '4_6', labelKey: 'onboarding.hours4to6' },
  { value: '6_8', labelKey: 'onboarding.hours6to8' },
  { value: '8_plus', labelKey: 'onboarding.hours8plus' },
];

export const LIFE_STRESS_OPTIONS: { value: LifeStress; labelKey: string }[] = [
  { value: 'low', labelKey: 'onboarding.stressLow' },
  { value: 'moderate', labelKey: 'onboarding.stressModerate' },
  { value: 'high', labelKey: 'onboarding.stressHigh' },
];

export const EXERCISE_FREQUENCY_OPTIONS: { value: ExerciseFrequency; labelKey: string }[] = [
  { value: 'rarely', labelKey: 'onboarding.exerciseRarely' },
  { value: 'weekly_1_2', labelKey: 'onboarding.exerciseWeekly12' },
  { value: 'weekly_3_plus', labelKey: 'onboarding.exerciseWeekly3' },
];

// "What do you think makes it worse?" — the user's hunches, which the app
// checks against their check-ins (src/lib/startingPicture.ts). Never conclusions.
export const SUSPECTED_TRIGGER_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'sitting', labelKey: 'onboarding.hunchSitting' },
  { value: 'standing', labelKey: 'onboarding.hunchStanding' },
  { value: 'screens', labelKey: 'onboarding.hunchScreens' },
  { value: 'stress', labelKey: 'onboarding.hunchStress' },
  { value: 'poor_sleep', labelKey: 'onboarding.hunchPoorSleep' },
  { value: 'sport', labelKey: 'onboarding.hunchSport' },
  { value: 'weather', labelKey: 'onboarding.hunchWeather' },
  { value: 'dont_know', labelKey: 'onboarding.hunchDontKnow' },
];

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

export const WORST_TIME_OF_DAY_OPTIONS: { value: WorstTimeOfDay; labelKey: string; descriptionKey?: string }[] = [
  { value: 'morning', labelKey: 'onboarding.worstTimeMorning' },
  { value: 'evening', labelKey: 'onboarding.worstTimeEvening' },
  { value: 'after_activity', labelKey: 'onboarding.worstTimeAfterActivity' },
  { value: 'no_pattern', labelKey: 'onboarding.worstTimeNoPattern' },
];

export const CHECKIN_DEPTH_OPTIONS: { value: CheckinDepthPreference; labelKey: string }[] = [
  { value: 'quick', labelKey: 'onboarding.depthQuick' },
  { value: 'detailed', labelKey: 'onboarding.depthDetailed' },
  { value: 'varies', labelKey: 'onboarding.depthVaries' },
];
