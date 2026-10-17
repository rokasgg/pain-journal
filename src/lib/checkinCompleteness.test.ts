import { firstIncompleteStep, getStepIssue, type CheckinStepValues, type StepIssueInput } from './checkinCompleteness';

const empty: CheckinStepValues = { pain_level: 0, symptoms: {}, triggers: [], notes: null };

function issue(overrides: Partial<StepIssueInput>) {
  return getStepIssue({
    step: 1,
    type: 'morning',
    isQuickMode: false,
    values: empty,
    inPain: null,
    noSymptomsConfirmed: false,
    ...overrides,
  });
}

describe('step 1 — pain gate', () => {
  it('requires the pain question to be answered', () => {
    expect(issue({ inPain: null })).toBe('answerPainQuestion');
    expect(issue({ inPain: false })).toBeNull();
  });

  it('requires a pain level of at least 1 when in pain', () => {
    expect(issue({ inPain: true })).toBe('setPainLevel');
    expect(issue({ inPain: true, values: { ...empty, pain_level: 1 } })).toBeNull();
  });
});

describe('step 2 — at least one answer', () => {
  it('morning: any sleep answer counts', () => {
    expect(issue({ step: 2 })).toBe('answerOneQuestion');
    expect(issue({ step: 2, values: { ...empty, sleep_hours: 0 } })).toBeNull();
    expect(issue({ step: 2, values: { ...empty, sleep_position: 'side' } })).toBeNull();
    expect(issue({ step: 2, values: { ...empty, notes: 'slept badly' } })).toBeNull();
    expect(issue({ step: 2, values: { ...empty, notes: '  ' } })).toBe('answerOneQuestion');
  });

  it('evening: activity, screen time, exercise or a note counts', () => {
    const evening = { step: 2, type: 'evening' as const };
    expect(issue(evening)).toBe('answerOneQuestion');
    expect(issue({ ...evening, values: { ...empty, notes: '   ' } })).toBe('answerOneQuestion');
    expect(issue({ ...evening, values: { ...empty, notes: 'long day' } })).toBeNull();
    expect(issue({ ...evening, values: { ...empty, did_exercises: false } })).toBeNull();
    expect(issue({ ...evening, values: { ...empty, activity_level: 0 } })).toBeNull();
  });
});

describe('step 3 — symptoms', () => {
  it('needs a symptom, a trigger, or "No symptoms today"', () => {
    expect(issue({ step: 3 })).toBe('answerSymptoms');
    expect(issue({ step: 3, noSymptomsConfirmed: true })).toBeNull();
    expect(issue({ step: 3, values: { ...empty, symptoms: { headache: true } } })).toBeNull();
    expect(issue({ step: 3, values: { ...empty, symptoms: { custom: ['dizzy'] } } })).toBeNull();
    expect(issue({ step: 3, values: { ...empty, triggers: ['stress'] } })).toBeNull();
  });

  it('pain areas alone do not count — they belong to step 1', () => {
    expect(issue({ step: 3, values: { ...empty, symptoms: { pain_areas: ['neck'] } } })).toBe('answerSymptoms');
  });

  it('is never required in quick mode', () => {
    expect(issue({ step: 3, isQuickMode: true })).toBeNull();
  });
});

describe('firstIncompleteStep', () => {
  it('finds the earliest step still missing an answer', () => {
    const base = { type: 'morning' as const, isQuickMode: false, noSymptomsConfirmed: true };
    expect(firstIncompleteStep({ ...base, values: empty, inPain: null }, 3)).toBe(1);
    expect(firstIncompleteStep({ ...base, values: empty, inPain: false }, 3)).toBe(2);
    expect(firstIncompleteStep({ ...base, values: { ...empty, sleep_quality: 6 }, inPain: false }, 3)).toBeNull();
  });
});
