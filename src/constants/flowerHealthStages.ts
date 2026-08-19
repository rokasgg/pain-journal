import { FLOWER_JUMP_SVG } from '@/constants/flowerJumpSvg';
import {
  BARE_FLOWER_SVG,
  DEFAULT_FLOWER_SVG,
  THRIVING_FLOWER_SVG,
  WILTING_FLOWER_SVG,
} from '@/constants/flowerStageSvgs';

export interface FlowerHealthStage {
  minScore: number;
  key: 'bare' | 'wilting' | 'okay' | 'thriving' | 'blooming';
  labelKey: string;
  /** SVG markup for this stage, if art exists yet — falls back to an Ionicons glyph otherwise. */
  svg?: string;
  icon: 'flower-outline' | 'leaf-outline';
  iconOpacity: number;
}

// Ordered ascending by minScore — the active stage is the last entry whose
// minScore <= the current (clamped 0-10) score. `bare`/`wilting`/`okay`/`thriving`
// use plain static SVGs (assets/icons/*.svg, no embedded animation); `blooming`
// keeps the animated splash flower as a celebratory top stage.
export const FLOWER_HEALTH_STAGES: FlowerHealthStage[] = [
  {
    minScore: 0,
    key: 'bare',
    labelKey: 'home.flowerStage.bare',
    icon: 'leaf-outline',
    iconOpacity: 0.35,
    svg: BARE_FLOWER_SVG,
  },
  {
    minScore: 2,
    key: 'wilting',
    labelKey: 'home.flowerStage.wilting',
    icon: 'leaf-outline',
    iconOpacity: 0.6,
    svg: WILTING_FLOWER_SVG,
  },
  {
    minScore: 4,
    key: 'okay',
    labelKey: 'home.flowerStage.okay',
    icon: 'flower-outline',
    iconOpacity: 0.75,
    svg: DEFAULT_FLOWER_SVG,
  },
  {
    minScore: 7,
    key: 'thriving',
    labelKey: 'home.flowerStage.thriving',
    icon: 'flower-outline',
    iconOpacity: 1,
    svg: THRIVING_FLOWER_SVG,
  },
  {
    minScore: 9,
    key: 'blooming',
    labelKey: 'home.flowerStage.blooming',
    icon: 'flower-outline',
    iconOpacity: 1,
    svg: FLOWER_JUMP_SVG,
  },
];

export function getFlowerHealthStage(score: number): FlowerHealthStage {
  let current = FLOWER_HEALTH_STAGES[0];
  for (const stage of FLOWER_HEALTH_STAGES) {
    if (score >= stage.minScore) {
      current = stage;
    }
  }
  return current;
}
