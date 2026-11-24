import { buildFindings, type FindingsInput } from '@/lib/findings';
import type { FlarePattern } from '@/lib/flareDetective';

const pattern = (factor: FlarePattern['factor']): FlarePattern => ({
  factor,
  direction: 'low',
  hits: 3,
  total: 4,
  usual: 7,
  ordinaryRate: 0.1,
});

const experiment = { id: 'e1', template: 'noScreensLate', custom_title: null };
const readyResult = (direction: 'lower' | 'higher' | 'similar') => ({
  status: 'ready' as const,
  followedDays: 6,
  pain: { during: 3, before: 4, direction },
  nextMorningPain: null,
  nextMorningStiffness: null,
  flaresPerWeekDuring: 0,
  flaresPerWeekBefore: 0,
});

// Everything ready and showing a difference.
const full: FindingsInput = {
  flare: {
    status: 'ready',
    flares: 4,
    patterns: [pattern('sleepHours'), pattern('steps')],
    triggers: [],
    timeOfDay: null,
    avgDurationMinutes: null,
  },
  experiments: [{ experiment, result: readyResult('lower'), finished: true }],
  training: {
    relief: { avgDrop: 1.2, sessions: 5 },
    nextDay: { afterTraining: 3, afterRest: 4, trainingDays: 4, restDays: 10 },
  },
  sleep: { status: 'ready', afterPoor: 5, afterGood: 3, direction: 'higher', entries: 12 },
  steps: { status: 'ready', afterActive: 3, afterQuiet: 4, threshold: 8000, direction: 'lower', entries: 10 },
  slots: { status: 'ready', morning: 5, evening: 3, diff: 2, direction: 'morningHigher', entries: 20 },
};

describe('buildFindings', () => {
  it('lists every real finding, strongest kind first', () => {
    const { findings, pending } = buildFindings(full);
    expect(findings.map((f) => f.kind)).toEqual([
      'flare',
      'experiment',
      'trainingRelief',
      'trainingNextDay',
      'sleep',
      'steps',
      'slots',
    ]);
    expect(pending).toBe(0);
    expect(findings[0]).toMatchObject({ kind: 'flare', morePatterns: 1, flares: 4 });
  });

  it('drops "about the same" results without counting them as pending', () => {
    const { findings, pending } = buildFindings({
      ...full,
      flare: { ...full.flare, patterns: [] } as FindingsInput['flare'],
      experiments: [{ experiment, result: readyResult('similar'), finished: true }],
      training: { relief: { avgDrop: 0.1, sessions: 5 }, nextDay: { ...full.training!.nextDay!, afterRest: 3.1 } },
      sleep: { ...full.sleep, direction: 'similar' } as FindingsInput['sleep'],
      steps: { ...full.steps, direction: 'similar' } as FindingsInput['steps'],
      slots: { ...full.slots, direction: 'similar' } as FindingsInput['slots'],
    });
    expect(findings).toEqual([]);
    expect(pending).toBe(0);
  });

  it('counts sources still waiting for data', () => {
    const { findings, pending } = buildFindings({
      flare: { status: 'notEnough', flares: 1, needed: 2 },
      experiments: [],
      training: { relief: null, nextDay: null },
      sleep: { status: 'oneSided', entries: 6 },
      steps: { status: 'notEnough', needed: 3 },
      slots: { status: 'notEnough', needed: 2 },
    });
    expect(findings).toEqual([]);
    expect(pending).toBe(6);
  });

  it('leaves out training and steps when they are not tracked, and no flare-ups is not pending', () => {
    const { findings, pending } = buildFindings({
      ...full,
      flare: { status: 'none' },
      training: null,
      steps: null,
    });
    expect(findings.map((f) => f.kind)).toEqual(['experiment', 'sleep', 'slots']);
    expect(pending).toBe(0);
  });

  it('only reports finished experiments', () => {
    const { findings } = buildFindings({
      ...full,
      experiments: [{ experiment, result: readyResult('lower'), finished: false }],
    });
    expect(findings.some((f) => f.kind === 'experiment')).toBe(false);
  });
});
