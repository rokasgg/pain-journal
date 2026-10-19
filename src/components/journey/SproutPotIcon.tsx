import Svg, { Line, Path, Rect } from 'react-native-svg';

// Artwork colours sampled from assets/possible-app-design/message — local
// constants rather than theme tokens, since this is an illustration.
const POT_FILL = '#C98A5E';
const POT_STROKE = '#7A4A2E';
const LEAF_FILL = '#6E9C7A';
const LEAF_STROKE = '#2F5A43';
const STROKE_WIDTH = 2.5;

export interface SproutPotIconProps {
  size?: number;
}

// Terracotta pot with a two-leaf sprout — the journey "growing" motif used on
// the locked-tab unlock sheet.
export function SproutPotIcon({ size = 48 }: SproutPotIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Line x1={32} y1={31} x2={32} y2={17} stroke={LEAF_STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path
        d="M32 22 C27 14, 19 15, 19 20 C21 25, 28 25, 32 22 Z"
        fill={LEAF_FILL}
        stroke={LEAF_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M32 18 C36 10, 45 10, 45 15 C44 20, 36 21, 32 18 Z"
        fill={LEAF_FILL}
        stroke={LEAF_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M19 36 H45 L41.5 53 H22.5 Z"
        fill={POT_FILL}
        stroke={POT_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Rect
        x={16}
        y={31}
        width={32}
        height={6}
        rx={1.5}
        fill={POT_FILL}
        stroke={POT_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
