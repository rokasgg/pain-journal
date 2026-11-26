import { Ellipse, G, Path } from 'react-native-svg';

import { AnimatedG, useBodyProps, useRotateProps } from '@/components/oak/oakAnim';
import { OAK_STAGES } from '@/components/oak/oakConfig';
import { OakSoilParts, type OakStageProps } from '@/components/oak/stages/OakParts';

const SOIL = OAK_STAGES[1].soil;

// assets/oak/oak-1-seed.svg, parts wrapped for animation. Paths unchanged.
export function OakSeed({ anim }: OakStageProps) {
  const bodyProps = useBodyProps(anim, SOIL);
  const acornProps = useRotateProps(anim.acornRotate, 60, 139);

  return (
    <G>
      <Ellipse cx="60" cy="147" rx="46" ry="9" fill="#D3E3D6" />
      <AnimatedG animatedProps={bodyProps}>
        <OakSoilParts soil={SOIL} anim={anim} />
        <AnimatedG animatedProps={acornProps}>
          <G transform="rotate(-14 60 139)">
            <Ellipse cx="60" cy="140.5" rx="5" ry="6" fill="#C49A5A" />
            <Ellipse cx="58.6" cy="139.5" rx="1.4" ry="3" fill="#FFFFFF" opacity={0.25} />
            <Ellipse cx="60" cy="135.6" rx="5.8" ry="3" fill="#7A563D" />
            <Path d="M60 132.8 L60.8 130.6" stroke="#7A563D" strokeWidth={1.4} strokeLinecap="round" />
          </G>
        </AnimatedG>
      </AnimatedG>
    </G>
  );
}
