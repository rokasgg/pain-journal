import { Ellipse } from 'react-native-svg';

import { AnimatedEllipse, useOpacityProps, WET_SOIL_COLOR, type OakAnimValues } from '@/components/oak/oakAnim';
import type { OakSoil } from '@/components/oak/oakConfig';

// The leaf shape from the Sprout/Sapling SVGs (stem tip at 0,0). Also used
// by GrowthCelebration's leaf burst.
export const OAK_LEAF_PATH =
  'M0 0 C-3 -1 -5 -3 -4 -5 C-6 -6 -6 -8 -4 -9 C-6 -11 -5 -13 -3 -13 C-3 -15 -1 -16 0 -16 C1 -16 3 -15 3 -13 C5 -13 6 -11 4 -9 C6 -8 6 -6 4 -5 C5 -3 3 -1 0 0 Z';

export interface OakStageProps {
  anim: OakAnimValues;
}

/** The dark soil ellipse plus its wet copy on top (opacity starts at 0). */
export function OakSoilParts({ soil, anim }: { soil: OakSoil; anim: OakAnimValues }) {
  const wetProps = useOpacityProps(anim.soilWet);
  return (
    <>
      <Ellipse cx={soil.cx} cy={soil.cy} rx={soil.rx} ry={5} fill="#6E4A33" />
      <AnimatedEllipse cx={soil.cx} cy={soil.cy} rx={soil.rx} ry={5} fill={WET_SOIL_COLOR} animatedProps={wetProps} />
    </>
  );
}
