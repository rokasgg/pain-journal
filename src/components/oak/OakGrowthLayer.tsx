import { useEffect } from 'react';
import {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, Path } from 'react-native-svg';

import { AnimatedG, gMatrixProps, pivotMatrix, useOpacityProps, type OakAnimValues } from '@/components/oak/oakAnim';
import { settle, timing } from '@/components/oak/oakTimeline';
import { OAK_STAGE_COMPONENTS } from '@/components/oak/stages';
import { OAK_LEAF_PATH } from '@/components/oak/stages/OakParts';
import type { OakStage } from '@/lib/oak';
import { haptics } from '@/utils/haptics';

const CENTER = { x: 60, y: 100 };
const LEAF_COLORS = ['#5E8F6B', '#8DBB97', '#C49A5A'];
const LEAF_COUNT = 8;
const BURST_DISTANCE = 70;

// Relative to `startAt`.
const T = {
  anticipation: 500,
  shrink: 250,
  flash: 550,
  flashDuration: 500,
  newStage: 650,
  burst: 750,
  burstDuration: 1300,
} as const;

/** How long the growth takes from `startAt` until the new stage has settled. */
export const OAK_GROWTH_DURATION_MS = T.newStage + 650;

const EASE_OUT = Easing.out(Easing.cubic);

function BurstLeaf({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / LEAF_COUNT) * Math.PI * 2 - Math.PI / 2 + 0.2;
  const spin = index % 2 === 0 ? 1 : -1;

  const props = useAnimatedProps(() => {
    const p = progress.get();
    const outT = Math.min(p / 0.45, 1);
    const out = 1 - (1 - outT) * (1 - outT) * (1 - outT);
    const fall = Math.max(0, (p - 0.35) / 0.65);
    const x = CENTER.x + Math.cos(angle) * BURST_DISTANCE * out + 6 * Math.sin(fall * Math.PI * 2) * fall;
    const y = CENTER.y + Math.sin(angle) * BURST_DISTANCE * out + 40 * fall * fall;
    const scale = 0.8 + 0.4 * out;
    return gMatrixProps(
      pivotMatrix(0, 0, spin * 220 * p, scale, scale, x, y),
      p <= 0 || p >= 1 ? 0 : p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4,
    );
  });

  return (
    <AnimatedG animatedProps={props}>
      <Path d={OAK_LEAF_PATH} fill={LEAF_COLORS[index % LEAF_COLORS.length]} />
    </AnimatedG>
  );
}

export interface OakGrowthLayerProps {
  from: OakStage;
  to: OakStage;
  /** The parent owns both stages' values, so it can run reactions and loops on them. */
  fromAnim: OakAnimValues;
  toAnim: OakAnimValues;
  /** ms after mount when the growth starts. */
  startAt: number;
  /** Jump to the end state (the new stage at rest, no flash or leaves). */
  skipped: boolean;
}

// SVG-only growth moment, drawn inside the parent's <Svg>: the old stage
// gathers itself (wiggle, swell) then shrinks away, a white flash, the new
// stage springs in (0.5 → 1.12 → 0.96 → 1) and eight oak leaves burst out.
// The oak stays at x 0–120, so the parent's viewBox needs room around it.
export function OakGrowthLayer({ from, to, fromAnim, toAnim, startAt, skipped }: OakGrowthLayerProps) {
  const OldStage = OAK_STAGE_COMPONENTS[from];
  const NewStage = OAK_STAGE_COMPONENTS[to];
  const oldOpacity = useSharedValue(1);
  const newOpacity = useSharedValue(0);
  const flash = useSharedValue(0);
  const leaf0 = useSharedValue(0);
  const leaf1 = useSharedValue(0);
  const leaf2 = useSharedValue(0);
  const leaf3 = useSharedValue(0);
  const leaf4 = useSharedValue(0);
  const leaf5 = useSharedValue(0);
  const leaf6 = useSharedValue(0);
  const leaf7 = useSharedValue(0);
  const leaves = [leaf0, leaf1, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7];

  const oldProps = useOpacityProps(oldOpacity);
  const newProps = useOpacityProps(newOpacity);
  const flashProps = useAnimatedProps(() => {
    const f = flash.get();
    const scale = 4.5 * f;
    return gMatrixProps(
      pivotMatrix(CENTER.x, CENTER.y, 0, scale, scale),
      f <= 0 || f >= 1 ? 0 : f < 0.1 ? 0.95 : 0.95 * (1 - (f - 0.1) / 0.9),
    );
  });

  useEffect(() => {
    toAnim.bodyScaleX.set(0.5);
    toAnim.bodyScaleY.set(0.5);
    const at = (ms: number) => startAt + ms;

    fromAnim.bodyRotate.set(
      withDelay(at(0), withSequence(timing(3, 100), timing(-3, 150), timing(3, 150), timing(0, 100))),
    );
    const oldScale = () =>
      withDelay(at(0), withSequence(timing(1.1, T.anticipation), timing(0.8, T.shrink, Easing.in(Easing.quad))));
    fromAnim.bodyScaleX.set(oldScale());
    fromAnim.bodyScaleY.set(oldScale());
    oldOpacity.set(withDelay(at(T.anticipation), timing(0, T.shrink)));

    flash.set(withDelay(at(T.flash), timing(1, T.flashDuration, Easing.out(Easing.quad))));

    newOpacity.set(withDelay(at(T.newStage), timing(1, 150)));
    const newScale = () =>
      withDelay(at(T.newStage), withSequence(timing(1.12, 250, EASE_OUT), timing(0.96, 200), timing(1, 200)));
    toAnim.bodyScaleX.set(newScale());
    toAnim.bodyScaleY.set(newScale());

    leaves.forEach((value) => value.set(withDelay(at(T.burst), timing(1, T.burstDuration, Easing.linear))));

    const flashTimer = setTimeout(() => haptics.grow(), at(T.flash));
    return () => clearTimeout(flashTimer);
    // Mounted fresh per celebration; the sequence runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skipped) return;
    settle(fromAnim, 0);
    settle(toAnim, 0);
    oldOpacity.set(0);
    newOpacity.set(1);
    flash.set(1);
    leaves.forEach((value) => value.set(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipped]);

  return (
    <>
      <AnimatedG animatedProps={oldProps}>
        <OldStage anim={fromAnim} />
      </AnimatedG>
      <AnimatedG animatedProps={newProps}>
        <NewStage anim={toAnim} />
      </AnimatedG>
      <AnimatedG animatedProps={flashProps}>
        <Circle cx={CENTER.x} cy={CENTER.y} r={14} fill="#FFFFFF" />
      </AnimatedG>
      {leaves.map((value, index) => (
        <BurstLeaf key={index} index={index} progress={value} />
      ))}
    </>
  );
}
