import { Ellipse, G, Path } from 'react-native-svg';

import { AnimatedG, useBodyProps, useRotateProps } from '@/components/oak/oakAnim';
import { OAK_STAGES } from '@/components/oak/oakConfig';
import { OAK_LEAF_PATH, OakSoilParts, type OakStageProps } from '@/components/oak/stages/OakParts';

const SOIL = OAK_STAGES[2].soil;

// assets/oak/oak-2-sprout.svg, parts wrapped for animation. Paths unchanged.
// One leaf group, pivoting where the leaves meet the stem.
export function OakSprout({ anim }: OakStageProps) {
  const bodyProps = useBodyProps(anim, SOIL);
  const leafProps = useRotateProps(anim.leafRotate[0], 60, 121, anim.leafScale[0]);

  return (
    <G>
      <Ellipse cx="60" cy="147" rx="46" ry="9" fill="#D3E3D6" />
      <AnimatedG animatedProps={bodyProps}>
        <OakSoilParts soil={SOIL} anim={anim} />
        <Ellipse cx="68" cy="142.6" rx="4" ry="2" fill="#7A563D" />
        <Path
          d="M60 145 C60 136 60.5 128 60 120"
          stroke="#4E7D5C"
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedG animatedProps={leafProps}>
          <Path d={OAK_LEAF_PATH} fill="#8DBB97" transform="translate(60 121) rotate(-42) scale(1.05)" />
          <Path d={OAK_LEAF_PATH} fill="#5E8F6B" transform="translate(60 121) rotate(40) scale(1.05)" />
        </AnimatedG>
      </AnimatedG>
    </G>
  );
}
