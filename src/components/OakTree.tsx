import { useEffect, useState, type FC } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import Oak1Seed from '@/assets/oak/oak-1-seed.svg';
import Oak2Sprout from '@/assets/oak/oak-2-sprout.svg';
import Oak3Sapling from '@/assets/oak/oak-3-sapling.svg';
import Oak4Young from '@/assets/oak/oak-4-young.svg';
import Oak5Mighty from '@/assets/oak/oak-5-mighty.svg';
import OakWatered from '@/assets/oak/oak-watered.svg';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS, type OakStage } from '@/lib/oak';

const STAGE_SVGS: Record<OakStage, FC<SvgProps>> = {
  1: Oak1Seed,
  2: Oak2Sprout,
  3: Oak3Sapling,
  4: Oak4Young,
  5: Oak5Mighty,
};

// All art is 120×160 on the same ground baseline.
const ASPECT = 160 / 120;
const STAGE_FADE_MS = 300;
const STAGE_START_SCALE = 0.96;
// Watered: fade in, hold, fade out — 1500 ms in total.
const WATER_FADE_MS = 300;
const WATER_HOLD_MS = 900;
const SWAY_DEGREES = 2;
const SWAY_EDGE_MS = 250; // 0 → +2° and back to 0
const SWAY_SWING_MS = 500; // +2° ↔ −2°
// Scale and sway pivot on the ground line, so the tree never lifts off it.
const BOTTOM_CENTER = '50% 100%';
const EASE = Easing.inOut(Easing.sin);

export interface OakTreeProps {
  stage: OakStage;
  watered?: boolean;
  size?: number;
  className?: string;
}

// The oak mascot. Fixed-size box (width = size, height = size·160/120) so a
// stage change never shifts layout. A stage change crossfades old → new
// (new one scales 0.96 → 1 from the ground); `watered` turning true shows
// the watered art for 1.5 s with a gentle ±2° sway, then returns. With
// reduced motion only the crossfades play. All animation runs on the UI
// thread (Reanimated).
export function OakTree({ stage, watered = false, size = 120, className }: OakTreeProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const height = size * ASPECT;

  // Derive the outgoing stage during render (not in an effect), so both
  // layers are on screen in the same frame the crossfade starts.
  const [current, setCurrent] = useState(stage);
  const [previous, setPrevious] = useState<OakStage | null>(null);
  if (stage !== current) {
    setPrevious(current);
    setCurrent(stage);
  }

  const stageProgress = useSharedValue(1);
  const water = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    // First mount shows the stage as-is; only real changes animate.
    if (previous === null) return;
    stageProgress.set(
      withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: STAGE_FADE_MS, easing: EASE })),
    );
  }, [current, previous, stageProgress]);

  useEffect(() => {
    if (!watered) return;
    water.set(
      withSequence(
        withTiming(1, { duration: WATER_FADE_MS, easing: EASE }),
        withDelay(WATER_HOLD_MS, withTiming(0, { duration: WATER_FADE_MS, easing: EASE })),
      ),
    );
    if (!reduceMotion) {
      sway.set(
        withSequence(
          withTiming(SWAY_DEGREES, { duration: SWAY_EDGE_MS, easing: EASE }),
          withRepeat(withTiming(-SWAY_DEGREES, { duration: SWAY_SWING_MS, easing: EASE }), 2, true),
          withTiming(0, { duration: SWAY_EDGE_MS, easing: EASE }),
        ),
      );
    }
  }, [watered, reduceMotion, water, sway]);

  useEffect(
    () => () => {
      cancelAnimation(stageProgress);
      cancelAnimation(water);
      cancelAnimation(sway);
    },
    [stageProgress, water, sway],
  );

  const swayStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value}deg` }] }));
  const stageGroupStyle = useAnimatedStyle(() => ({ opacity: 1 - water.value }));
  const wateredStyle = useAnimatedStyle(() => ({ opacity: water.value }));
  const previousStyle = useAnimatedStyle(() => ({ opacity: 1 - stageProgress.value }));
  const currentStyle = useAnimatedStyle(() => ({
    opacity: stageProgress.value,
    transform: [{ scale: reduceMotion ? 1 : STAGE_START_SCALE + (1 - STAGE_START_SCALE) * stageProgress.value }],
  }));

  const CurrentSvg = STAGE_SVGS[current];
  const PreviousSvg = previous === null ? null : STAGE_SVGS[previous];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('oak.a11y', { stage: t(OAK_STAGE_NAME_KEYS[current]) })}
      className={className}
      style={{ width: size, height }}
    >
      <Animated.View className="absolute inset-0" style={[{ transformOrigin: BOTTOM_CENTER }, swayStyle]}>
        <Animated.View className="absolute inset-0" style={stageGroupStyle}>
          {PreviousSvg && (
            <Animated.View className="absolute inset-0" style={previousStyle}>
              <PreviousSvg width={size} height={height} />
            </Animated.View>
          )}
          <Animated.View className="absolute inset-0" style={[{ transformOrigin: BOTTOM_CENTER }, currentStyle]}>
            <CurrentSvg width={size} height={height} />
          </Animated.View>
        </Animated.View>
        <Animated.View className="absolute inset-0" style={wateredStyle}>
          <OakWatered width={size} height={height} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
