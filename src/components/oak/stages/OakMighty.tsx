import { Ellipse, G, Path } from 'react-native-svg';

import { AnimatedG, useBodyProps, useRotateProps, useTranslateYProps } from '@/components/oak/oakAnim';
import { OAK_STAGES } from '@/components/oak/oakConfig';
import { OakSoilParts, type OakStageProps } from '@/components/oak/stages/OakParts';

const SOIL = OAK_STAGES[4].soil;
const CANOPY_PIVOT = { x: 60, y: 92 };
// Each acorn's nut (cx, cy); its cap sits 2.7 above.
const ACORNS = [
  { cx: 44, cy: 67.5 },
  { cx: 72, cy: 59.5 },
  { cx: 86, cy: 71.5 },
  { cx: 54, cy: 47.5 },
  { cx: 30, cy: 59.5 },
] as const;

function Acorn({ anim, index }: OakStageProps & { index: number }) {
  const props = useTranslateYProps(anim.acornY[index]);
  const { cx, cy } = ACORNS[index];
  return (
    <AnimatedG animatedProps={props}>
      <Ellipse cx={cx} cy={cy} rx="2.6" ry="3.2" fill="#C49A5A" />
      <Ellipse cx={cx} cy={cy - 2.7} rx="3" ry="1.8" fill="#7A563D" />
    </AnimatedG>
  );
}

// assets/oak/oak-5-mighty.svg, parts wrapped for animation. Paths unchanged.
// The acorns hang on the front canopy, so they sway with it.
export function OakMighty({ anim }: OakStageProps) {
  const bodyProps = useBodyProps(anim, SOIL);
  const backProps = useRotateProps(anim.canopyBackRotate, CANOPY_PIVOT.x, CANOPY_PIVOT.y);
  const frontProps = useRotateProps(anim.canopyFrontRotate, CANOPY_PIVOT.x, CANOPY_PIVOT.y);

  return (
    <G>
      <Ellipse cx="60" cy="149" rx="57" ry="9" fill="#D3E3D6" />
      <AnimatedG animatedProps={bodyProps}>
        <OakSoilParts soil={SOIL} anim={anim} />
        <AnimatedG animatedProps={backProps}>
          <Path
            d="M8 84 C2 74 6 60 16 56 C14 42 26 32 38 34 C42 20 56 14 68 18 C80 12 96 20 98 32 C110 34 118 48 112 60 C120 68 116 82 106 86 C96 92 84 88 78 90 C70 94 50 94 42 90 C34 92 18 92 8 84 Z"
            fill="#5E8F6B"
          />
        </AnimatedG>
        <Path
          d="M30 148 C38 145 42 140 43 132 C44 122 44 114 46 106 C40 100 33 92 29 80 C28 77 31 76 32 79 C36 88 43 93 49 97 C50 90 49 82 46 74 C45 71 49 69 50 72 C54 80 56 88 57 95 C62 88 66 80 68 72 C69 69 73 70 72 73 C70 82 67 90 64 97 C72 92 83 88 89 78 C90 75 93 76 92 79 C88 90 80 100 75 106 C77 114 77 122 78 132 C79 140 83 145 92 148 Z"
          fill="#6B4A33"
        />
        <Path
          d="M62 104 C66 112 66 124 66 132 C66 140 70 145 76 148 L92 148 C83 145 79 140 78 132 C77 122 77 114 75 106 C70 104 66 103 62 104 Z"
          fill="#563A27"
        />
        <Path
          d="M49 141 C50 130 49 120 51 110 M56 143 C56 132 57 122 56 114 M70 141 C71 130 70 120 72 111"
          stroke="#563A27"
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse cx="58" cy="125" rx="3.6" ry="6.5" fill="#3B2718" />
        <AnimatedG animatedProps={frontProps}>
          <Path
            d="M14 74 C10 64 16 54 26 52 C26 40 38 32 48 34 C52 24 64 20 74 24 C86 20 98 28 98 38 C108 42 112 54 106 62 C108 72 98 78 90 76 C82 82 70 80 64 78 C56 82 42 82 36 78 C26 82 16 80 14 74 Z"
            fill="#8DBB97"
          />
          <Path
            d="M24 62 C30 58 38 58 42 62 M64 44 C70 40 78 40 84 44 M44 50 C48 47 54 47 57 50 M78 62 C82 59 88 59 92 62 M48 70 C54 66 62 66 68 70"
            stroke="#5E8F6B"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            opacity={0.45}
          />
          <Ellipse cx="56" cy="31" rx="15" ry="6" fill="#FFFFFF" opacity={0.13} />
          {ACORNS.map((_, index) => (
            <Acorn key={index} anim={anim} index={index} />
          ))}
        </AnimatedG>
      </AnimatedG>
    </G>
  );
}
