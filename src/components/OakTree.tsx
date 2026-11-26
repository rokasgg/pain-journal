import { useEffect, useState, type FC } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import Oak1Seed from '@/assets/oak/oak-1-seed.svg';
import Oak2Sprout from '@/assets/oak/oak-2-sprout.svg';
import Oak3Sapling from '@/assets/oak/oak-3-sapling.svg';
import Oak4Young from '@/assets/oak/oak-4-young.svg';
import Oak5Mighty from '@/assets/oak/oak-5-mighty.svg';
import OakIcon1Seed from '@/assets/oak/oak-icon-1-seed.svg';
import OakIcon2Sprout from '@/assets/oak/oak-icon-2-sprout.svg';
import OakIcon3Sapling from '@/assets/oak/oak-icon-3-sapling.svg';
import OakIcon4Young from '@/assets/oak/oak-icon-4-young.svg';
import OakIcon5Mighty from '@/assets/oak/oak-icon-5-mighty.svg';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS, type OakStage } from '@/lib/oak';

export type OakTreeVariant = 'scene' | 'icon';

// scene: 120×160 canvas, stages to scale on one ground line (growth reads as
// height). icon: 64×64 redraw where every stage fills the tile, for small
// spots (Home card, unlock sheet); also on one shared ground line.
const VARIANT_ART: Record<OakTreeVariant, { svgs: Record<OakStage, FC<SvgProps>>; aspect: number }> = {
  scene: {
    svgs: { 1: Oak1Seed, 2: Oak2Sprout, 3: Oak3Sapling, 4: Oak4Young, 5: Oak5Mighty },
    aspect: 160 / 120,
  },
  icon: {
    svgs: { 1: OakIcon1Seed, 2: OakIcon2Sprout, 3: OakIcon3Sapling, 4: OakIcon4Young, 5: OakIcon5Mighty },
    aspect: 1,
  },
};

const STAGE_FADE_MS = 300;
const STAGE_START_SCALE = 0.96;
// Scale pivots on the ground line, so the tree never lifts off it.
const BOTTOM_CENTER = '50% 100%';
const EASE = Easing.inOut(Easing.sin);

export interface OakTreeProps {
  stage: OakStage;
  size?: number;
  variant?: OakTreeVariant;
  className?: string;
}

// The oak mascot. Fixed-size box (width = size, height = size × the
// variant's aspect) so a stage change never shifts layout. A stage change
// crossfades old → new (new one scales 0.96 → 1 from the ground). With
// reduced motion only the fade plays. The animated celebration oaks live in
// components/oak/ (CheckinSkyScene, WateringCelebration).
export function OakTree({ stage, size = 120, variant = 'scene', className }: OakTreeProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { svgs, aspect } = VARIANT_ART[variant];
  const height = size * aspect;

  // Derive the outgoing stage during render (not in an effect), so both
  // layers are on screen in the same frame the crossfade starts.
  const [current, setCurrent] = useState(stage);
  const [previous, setPrevious] = useState<OakStage | null>(null);
  if (stage !== current) {
    setPrevious(current);
    setCurrent(stage);
  }

  const stageProgress = useSharedValue(1);

  useEffect(() => {
    // First mount shows the stage as-is; only real changes animate.
    if (previous === null) return;
    stageProgress.set(
      withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: STAGE_FADE_MS, easing: EASE })),
    );
  }, [current, previous, stageProgress]);

  useEffect(
    () => () => {
      cancelAnimation(stageProgress);
    },
    [stageProgress],
  );

  const previousStyle = useAnimatedStyle(() => ({ opacity: 1 - stageProgress.value }));
  const currentStyle = useAnimatedStyle(() => ({
    opacity: stageProgress.value,
    transform: [{ scale: reduceMotion ? 1 : STAGE_START_SCALE + (1 - STAGE_START_SCALE) * stageProgress.value }],
  }));

  const CurrentSvg = svgs[current];
  const PreviousSvg = previous === null ? null : svgs[previous];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('oak.a11y', { stage: t(OAK_STAGE_NAME_KEYS[current]) })}
      className={className}
      style={{ width: size, height }}
    >
      {PreviousSvg && (
        <Animated.View className="absolute inset-0" style={previousStyle}>
          <PreviousSvg width={size} height={height} />
        </Animated.View>
      )}
      <Animated.View className="absolute inset-0" style={[{ transformOrigin: BOTTOM_CENTER }, currentStyle]}>
        <CurrentSvg width={size} height={height} />
      </Animated.View>
    </View>
  );
}
