import type { CheckinSymptoms, CheckinType } from '@/types/database.types';

// Minimum answers per check-in wizard step — one real answer per step, so an
// untouched check-in can never be saved (it used to save as a pain-free day,
// inflating the pain-free tile, the graph and Monthly Wraps).

export type CheckinStepIssue = 'answerPainQuestion' | 'setPainLevel' | 'answerOneQuestion' | 'answerSymptoms';

// Loose shape so both morning and evening form values fit.
export interface CheckinStepValues {
  pain_level: number;
  symptoms: CheckinSymptoms;
  triggers: string[];
  notes?: string | null;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  sleep_position?: string | null;
  sleep_positions?: string[];
  activity_level?: number | null;
  screen_time_hours?: number | null;
  did_exercises?: boolean | null;
}

export interface StepIssueInput {
  step: number;
  type: CheckinType;
  isQuickMode: boolean;
  values: CheckinStepValues;
  // The pain gate: "woke up in pain?" (morning) / "in pain now?" (evening).
  // null = not answered yet.
  inPain: boolean | null;
  noSymptomsConfirmed: boolean;
}

function hasAnyStep2Answer(type: CheckinType, values: CheckinStepValues): boolean {
  if (type === 'morning') {
    const hasNote = (values.notes ?? '').trim().length > 0;
    return (
      values.sleep_quality != null ||
      values.sleep_hours != null ||
      values.sleep_position != null ||
      (values.sleep_positions ?? []).length > 0 ||
      hasNote
    );
  }
  // Evening notes live on step 3 now (with the symptoms), so they no longer
  // count here.
  return values.activity_level != null || values.screen_time_hours != null || values.did_exercises != null;
}

function hasAnySymptomAnswer(values: CheckinStepValues): boolean {
  const { tingling, numbness, weakness, headache, dizziness, radiating_to, custom } = values.symptoms;
  return (
    !!tingling ||
    !!numbness ||
    !!weakness ||
    !!headache ||
    !!dizziness ||
    (radiating_to ?? '').trim().length > 0 ||
    (custom ?? []).length > 0 ||
    values.triggers.length > 0
  );
}

export function getStepIssue({
  step,
  type,
  isQuickMode,
  values,
  inPain,
  noSymptomsConfirmed,
}: StepIssueInput): CheckinStepIssue | null {
  if (step === 1) {
    if (inPain === null) return 'answerPainQuestion';
    // "Yes, I'm in pain" at level 0 is a contradiction — make them set it.
    if (inPain && values.pain_level < 1) return 'setPainLevel';
    return null;
  }
  if (step === 2) {
    return hasAnyStep2Answer(type, values) ? null : 'answerOneQuestion';
  }
  // Quick mode folds symptoms into an optional expander — the user opted out
  // of detail during onboarding, so it's never required there.
  if (step === 3 && !isQuickMode) {
    return hasAnySymptomAnswer(values) || noSymptomsConfirmed ? null : 'answerSymptoms';
  }
  return null;
}

// First step (1..totalSteps) with a missing answer — Save re-checks all of
// them so no path can save an incomplete check-in.
export function firstIncompleteStep(input: Omit<StepIssueInput, 'step'>, totalSteps: number): number | null {
  for (let step = 1; step <= totalSteps; step++) {
    if (getStepIssue({ ...input, step })) return step;
  }
  return null;
}
