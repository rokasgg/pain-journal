import { toLocalDate } from '@/lib/dates';
import { OAK_STAGE_NAME_KEYS } from '@/lib/oak';

// The training oak: it grows from "waterings", one per local day with at
// least one logged workout (exercise_logs). Derived, never stored: no extra
// table. Progress only ever goes up, so a missed day changes nothing and
// the oak never wilts.

export type OakStageKey = 'seed' | 'sprout' | 'sapling' | 'young' | 'mighty';
export type OakReaction = 'wiggle' | 'perk' | 'sway' | 'swayAcorns';

export interface OakSoil {
  cx: number;
  cy: number;
  rx: number;
}

export interface OakPoint {
  x: number;
  y: number;
}

/** Where the watering can sits and where its drops fall, in the 150×160 celebration canvas. */
export interface OakWateringLayout {
  can: OakPoint;
  dropFrom: OakPoint;
  dropTo: OakPoint;
}

// Small stages: the can sits up and to the right; drops fall straight down
// onto the soil. Young/Mighty: the canopy is wide, so the can sits lower and
// further right and the drops land on the right edge of the soil.
const WATER_SMALL: OakWateringLayout = {
  can: { x: 100, y: 58 },
  dropFrom: { x: 77, y: 62 },
  dropTo: { x: 77, y: 143 },
};
const WATER_YOUNG: OakWateringLayout = {
  can: { x: 122, y: 96 },
  dropFrom: { x: 98, y: 101 },
  dropTo: { x: 86, y: 145 },
};
const WATER_MIGHTY: OakWateringLayout = {
  can: { x: 122, y: 96 },
  dropFrom: { x: 98, y: 101 },
  dropTo: { x: 90, y: 146.5 },
};

export const OAK_STAGES = [
  {
    key: 'seed',
    nameKey: OAK_STAGE_NAME_KEYS[1],
    minWaterings: 0,
    soil: { cx: 60, cy: 145, rx: 24 },
    reaction: 'wiggle',
    water: WATER_SMALL,
  },
  {
    key: 'sprout',
    nameKey: OAK_STAGE_NAME_KEYS[2],
    minWaterings: 3,
    soil: { cx: 60, cy: 145, rx: 24 },
    reaction: 'perk',
    water: WATER_SMALL,
  },
  {
    key: 'sapling',
    nameKey: OAK_STAGE_NAME_KEYS[3],
    minWaterings: 10,
    soil: { cx: 60, cy: 145, rx: 24 },
    reaction: 'perk',
    water: WATER_SMALL,
  },
  {
    key: 'young',
    nameKey: OAK_STAGE_NAME_KEYS[4],
    minWaterings: 25,
    soil: { cx: 60, cy: 146, rx: 28 },
    reaction: 'sway',
    water: WATER_YOUNG,
  },
  {
    key: 'mighty',
    nameKey: OAK_STAGE_NAME_KEYS[5],
    minWaterings: 50,
    soil: { cx: 60, cy: 147.5, rx: 38 },
    reaction: 'swayAcorns',
    water: WATER_MIGHTY,
  },
] as const satisfies readonly {
  key: OakStageKey;
  nameKey: string;
  minWaterings: number;
  soil: OakSoil;
  reaction: OakReaction;
  water: OakWateringLayout;
}[];

export type OakStageConfig = (typeof OAK_STAGES)[number];
export const LAST_OAK_STAGE_INDEX = OAK_STAGES.length - 1;

export interface OakProgress {
  stageIndex: number;
  stage: OakStageConfig;
  /** The next stage, or null at Mighty. */
  next: OakStageConfig | null;
  /** Waterings since this stage began ("3" in "3 of 5 to Young"). */
  inStage: number;
  /** Waterings this stage takes in total ("5"); 0 at Mighty. */
  needed: number;
}

export function getOakProgress(waterings: number): OakProgress {
  const count = Math.max(0, Math.floor(waterings));
  let stageIndex = 0;
  OAK_STAGES.forEach((stage, index) => {
    if (count >= stage.minWaterings) stageIndex = index;
  });
  const stage = OAK_STAGES[stageIndex];
  const next = stageIndex < LAST_OAK_STAGE_INDEX ? OAK_STAGES[stageIndex + 1] : null;
  return {
    stageIndex,
    stage,
    next,
    inStage: count - stage.minWaterings,
    needed: next ? next.minWaterings - stage.minWaterings : 0,
  };
}

/** Waterings = distinct local days with a logged workout, so growth is daily, not per tap. */
export function countWaterings(loggedAts: readonly string[]): number {
  return new Set(loggedAts.map((ts) => toLocalDate(ts))).size;
}

export interface TrainingCelebration {
  kind: 'watering' | 'growth';
  /** Stage before this workout. Equals `stageIndex` unless it grew. */
  fromStageIndex: number;
  /** Stage after this workout. */
  stageIndex: number;
  /** Waterings after this workout, or null when the count wasn't loaded (no progress shown). */
  waterings: number | null;
  /** True when this workout added a watering (the first one today). */
  counted: boolean;
}

/**
 * What to celebrate after a workout is saved. `before` is the watering count
 * captured before the save (null if not loaded); `wateredToday` says whether
 * a workout was already logged today, in which case nothing new is counted.
 */
export function buildTrainingCelebration(before: number | null, wateredToday: boolean): TrainingCelebration {
  if (before === null) {
    return { kind: 'watering', fromStageIndex: 0, stageIndex: 0, waterings: null, counted: false };
  }
  const counted = !wateredToday;
  const after = counted ? before + 1 : before;
  const fromStageIndex = getOakProgress(before).stageIndex;
  const stageIndex = getOakProgress(after).stageIndex;
  return {
    kind: stageIndex > fromStageIndex ? 'growth' : 'watering',
    fromStageIndex,
    stageIndex,
    waterings: after,
    counted,
  };
}
