import {
  applyPreset,
  buildTrainingLog,
  cleanExerciseName,
  EMPTY_TRAINING_DRAFT,
  findExerciseByName,
  isPresetApplied,
  matchingPresetId,
  normalizeExerciseName,
  setDetail,
  toggleTicked,
  type TrainingDraft,
} from './trainingLog';

const exercises = [
  { id: 'a', name: 'Chin tucks' },
  { id: 'b', name: 'Band pull-aparts' },
  { id: 'c', name: 'Wall angels' },
];
const dayA = { id: 'p1', exercise_ids: ['a', 'b'] };
const dayB = { id: 'p2', exercise_ids: ['c'] };

describe('names', () => {
  it('cleans and normalizes', () => {
    expect(cleanExerciseName('  Chin   tucks ')).toBe('Chin tucks');
    expect(normalizeExerciseName('  CHIN  Tucks')).toBe('chin tucks');
  });

  it('finds an exercise regardless of case and spacing', () => {
    expect(findExerciseByName(exercises, 'chin  TUCKS ')?.id).toBe('a');
    expect(findExerciseByName(exercises, 'Plank')).toBeUndefined();
  });
});

describe('ticking and presets', () => {
  it('toggles a tick', () => {
    const once = toggleTicked(EMPTY_TRAINING_DRAFT, 'a');
    expect(once.ticked).toEqual(['a']);
    expect(toggleTicked(once, 'a').ticked).toEqual([]);
  });

  it('applies a preset additively and keeps other ticks', () => {
    const draft = applyPreset(toggleTicked(EMPTY_TRAINING_DRAFT, 'c'), dayA.exercise_ids);
    expect(draft.ticked).toEqual(['c', 'a', 'b']);
    expect(isPresetApplied(draft, dayA.exercise_ids)).toBe(true);
  });

  it('a second tap on an applied preset unticks only its exercises', () => {
    const draft = applyPreset(applyPreset(toggleTicked(EMPTY_TRAINING_DRAFT, 'c'), dayA.exercise_ids), dayA.exercise_ids);
    expect(draft.ticked).toEqual(['c']);
  });

  it('a partly applied preset ticks the rest', () => {
    const draft = applyPreset(toggleTicked(EMPTY_TRAINING_DRAFT, 'a'), dayA.exercise_ids);
    expect(draft.ticked).toEqual(['a', 'b']);
  });

  it('an empty preset is never "applied"', () => {
    expect(isPresetApplied(EMPTY_TRAINING_DRAFT, [])).toBe(false);
  });

  it('matches the preset with the most overlap', () => {
    const draft: TrainingDraft = { ticked: ['a', 'c'], details: {} };
    expect(matchingPresetId(draft, [dayB, dayA])).toBe('p2');
    expect(matchingPresetId({ ticked: ['a', 'b', 'c'], details: {} }, [dayB, dayA])).toBe('p1');
    expect(matchingPresetId(EMPTY_TRAINING_DRAFT, [dayA])).toBeNull();
  });
});

describe('buildTrainingLog', () => {
  it('returns null when nothing is ticked', () => {
    expect(buildTrainingLog(EMPTY_TRAINING_DRAFT, exercises, [dayA])).toBeNull();
  });

  it('stores only ticked exercises, with a name snapshot', () => {
    const draft = setDetail(toggleTicked(EMPTY_TRAINING_DRAFT, 'c'), 'c', { painDiscomfortLevel: 6, note: '  tight ' });
    const log = buildTrainingLog(draft, exercises, []);
    expect(log).toEqual({
      routine_id: null,
      status: 'FULL',
      completed_exercises: [
        { exercise_id: 'c', name: 'Wall angels', completed: true, pain_discomfort_level: 6, flagged_pain: true, note: 'tight' },
      ],
    });
  });

  it('is FULL when the matching preset is complete, PARTIAL otherwise', () => {
    const full = buildTrainingLog(applyPreset(EMPTY_TRAINING_DRAFT, dayA.exercise_ids), exercises, [dayA, dayB]);
    expect(full?.routine_id).toBe('p1');
    expect(full?.status).toBe('FULL');

    const partial = buildTrainingLog(toggleTicked(EMPTY_TRAINING_DRAFT, 'a'), exercises, [dayA, dayB]);
    expect(partial?.status).toBe('PARTIAL');
  });

  it('ignores preset exercises that are no longer in the library', () => {
    const preset = { id: 'p3', exercise_ids: ['a', 'gone'] };
    const log = buildTrainingLog(toggleTicked(EMPTY_TRAINING_DRAFT, 'a'), exercises, [preset]);
    expect(log?.status).toBe('FULL');
  });

  it('skips ticked ids that are not in the library', () => {
    const log = buildTrainingLog({ ticked: ['gone', 'a'], details: {} }, exercises, []);
    expect(log?.completed_exercises.map((e) => e.exercise_id)).toEqual(['a']);
  });

  it('does not flag low discomfort', () => {
    const draft = setDetail(toggleTicked(EMPTY_TRAINING_DRAFT, 'a'), 'a', { painDiscomfortLevel: 4 });
    expect(buildTrainingLog(draft, exercises, [])?.completed_exercises[0].flagged_pain).toBe(false);
  });
});
