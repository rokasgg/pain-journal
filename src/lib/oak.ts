export type OakStage = 1 | 2 | 3 | 4 | 5;

// Lower bound (inclusive) of logged days per stage, ascending. Matches the
// journey milestones (3 → History, 7 → Insights, 14 → Reports).
const STAGE_THRESHOLDS: readonly (readonly [number, OakStage])[] = [
  [14, 5],
  [7, 4],
  [3, 3],
  [1, 2],
];

// The oak only ever grows: its stage is a pure function of a count that
// never decreases, so a missed day pauses growth and nothing wilts.
export function getOakStage(count: number): OakStage {
  for (const [min, stage] of STAGE_THRESHOLDS) {
    if (count >= min) return stage;
  }
  return 1;
}

export const OAK_STAGE_NAME_KEYS: Record<OakStage, string> = {
  1: 'oak.stage1',
  2: 'oak.stage2',
  3: 'oak.stage3',
  4: 'oak.stage4',
  5: 'oak.stage5',
};
