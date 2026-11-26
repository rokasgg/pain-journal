import { Ellipse, G, Path } from 'react-native-svg';

import { AnimatedG, useBodyProps, useRotateProps } from '@/components/oak/oakAnim';
import { OAK_STAGES } from '@/components/oak/oakConfig';
import { OAK_LEAF_PATH, OakSoilParts, type OakStageProps } from '@/components/oak/stages/OakParts';

const SOIL = OAK_STAGES[2].soil;

// assets/oak/oak-3-sapling.svg, parts wrapped for animation. Paths unchanged.
// Two leaf groups: the branch leaves (pivot 70,104) and the top cluster (60,96).
export function OakSapling({ anim }: OakStageProps) {
  const bodyProps = useBodyProps(anim, SOIL);
  const branchProps = useRotateProps(anim.leafRotate[0], 70, 104, anim.leafScale[0]);
  const topProps = useRotateProps(anim.leafRotate[1], 60, 96, anim.leafScale[1]);

  return (
    <G>
      <Ellipse cx="60" cy="147" rx="46" ry="9" fill="#D3E3D6" />
      <AnimatedG animatedProps={bodyProps}>
        <OakSoilParts soil={SOIL} anim={anim} />
        <Path d="M58.4 145 C58.8 128 59 112 59.4 94 L61.2 94 C61.4 112 61.6 128 62.2 145 Z" fill="#7A563D" />
        <Path
          d="M60.5 114 C64 110 67 107 70 103"
          stroke="#7A563D"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedG animatedProps={branchProps}>
          <Path d={OAK_LEAF_PATH} fill="#5E8F6B" transform="translate(70 104) rotate(35) scale(1.05)" />
          <Path d={OAK_LEAF_PATH} fill="#8DBB97" transform="translate(70 104) rotate(80) scale(0.95)" />
        </AnimatedG>
        <AnimatedG animatedProps={topProps}>
          <Path d={OAK_LEAF_PATH} fill="#5E8F6B" transform="translate(60 96) rotate(-62) scale(1.2)" />
          <Path d={OAK_LEAF_PATH} fill="#8DBB97" transform="translate(60 96) rotate(-24) scale(1.25)" />
          <Path d={OAK_LEAF_PATH} fill="#5E8F6B" transform="translate(60 96) rotate(18) scale(1.25)" />
          <Path d={OAK_LEAF_PATH} fill="#8DBB97" transform="translate(60 96) rotate(56) scale(1.15)" />
        </AnimatedG>
      </AnimatedG>
    </G>
  );
}
