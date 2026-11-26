import { OAK_STAGE_NAME_KEYS, type OakStage } from '@/lib/oak';

// Per-stage geometry for the animated oak (stages/Oak*.tsx). There is ONE
// oak: its stage comes from logged check-in days (getOakStage in lib/oak.ts).
// The check-in moment (CheckinSkyScene) and the training moment
// (WateringCelebration) both draw that same stage; training never changes it.

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

/** Where the watering can sits and where its drops fall, in the 150×160 watering canvas. */
export interface OakWateringLayout {
  can: OakPoint;
  dropFrom: OakPoint;
  dropTo: OakPoint;
}

export interface OakStageConfig {
  stage: OakStage;
  key: OakStageKey;
  nameKey: string;
  soil: OakSoil;
  /** The visual centre of the leaves/canopy: where the sun's glow and the fireflies aim. */
  crown: OakPoint;
  reaction: OakReaction;
  water: OakWateringLayout;
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

export const OAK_STAGES: Record<OakStage, OakStageConfig> = {
  1: {
    stage: 1,
    key: 'seed',
    nameKey: OAK_STAGE_NAME_KEYS[1],
    soil: { cx: 60, cy: 145, rx: 24 },
    crown: { x: 60, y: 136 },
    reaction: 'wiggle',
    water: WATER_SMALL,
  },
  2: {
    stage: 2,
    key: 'sprout',
    nameKey: OAK_STAGE_NAME_KEYS[2],
    soil: { cx: 60, cy: 145, rx: 24 },
    crown: { x: 60, y: 112 },
    reaction: 'perk',
    water: WATER_SMALL,
  },
  3: {
    stage: 3,
    key: 'sapling',
    nameKey: OAK_STAGE_NAME_KEYS[3],
    soil: { cx: 60, cy: 145, rx: 24 },
    crown: { x: 62, y: 98 },
    reaction: 'perk',
    water: WATER_SMALL,
  },
  4: {
    stage: 4,
    key: 'young',
    nameKey: OAK_STAGE_NAME_KEYS[4],
    soil: { cx: 60, cy: 146, rx: 28 },
    crown: { x: 60, y: 64 },
    reaction: 'sway',
    water: WATER_YOUNG,
  },
  5: {
    stage: 5,
    key: 'mighty',
    nameKey: OAK_STAGE_NAME_KEYS[5],
    soil: { cx: 60, cy: 147.5, rx: 38 },
    crown: { x: 60, y: 56 },
    reaction: 'swayAcorns',
    water: WATER_MIGHTY,
  },
};

export const OAK_STAGE_LIST: readonly OakStage[] = [1, 2, 3, 4, 5];

/** Shown while the real stage is still loading; it only affects the art. */
export const FALLBACK_OAK_STAGE: OakStage = 3;

export interface TrainingCelebration {
  /** The one oak's current stage (from check-in days), or null while loading. */
  stage: OakStage | null;
  /** Training days this week after this workout; null hides the weekly card. */
  sessions: number | null;
  goal: number;
  /** True when this workout added a training day (its drop pops in). */
  counted: boolean;
}

/**
 * What the watering moment shows after a workout. `weekCountBefore` is this
 * week's training days captured before the save (null if not loaded). A
 * second workout on the same day adds no new day.
 */
export function buildTrainingCelebration(input: {
  stage: OakStage | null;
  weekCountBefore: number | null;
  goal: number;
  wateredToday: boolean;
}): TrainingCelebration {
  const counted = !input.wateredToday;
  const sessions = input.weekCountBefore === null ? null : input.weekCountBefore + (counted ? 1 : 0);
  return { stage: input.stage, sessions, goal: Math.max(1, input.goal), counted };
}
