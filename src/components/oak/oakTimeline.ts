import { Easing, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { ACORN_COUNT, LEAF_GROUP_COUNT, type OakAnimValues } from '@/components/oak/oakAnim';
import type { OakReaction } from '@/components/oak/oakConfig';

// Animation builders shared by WateringCelebration and GrowthCelebration.
// They're built on the JS thread but run on the UI thread (Reanimated
// animations), so nothing here sets React state per frame.

const SINE = Easing.inOut(Easing.sin);

export const IDLE_SWAY_DEG = 1.2;
const IDLE_PERIOD_MS = 3400;
const CANOPY_SWAY_DEG = 1.4;
const CANOPY_FRONT_PERIOD_MS = 3200;
const CANOPY_BACK_PERIOD_MS = 4000;

export function timing(toValue: number, duration: number, easing = SINE) {
  return withTiming(toValue, { duration, easing });
}

/** An endless ±amplitude swing; one full period per cycle. */
export function swingLoop(amplitude: number, periodMs: number) {
  return withRepeat(withSequence(timing(amplitude, periodMs / 2), timing(-amplitude, periodMs / 2)), -1);
}

/** The calm loop after the moment: the whole body sways ±1.2° every 3.4 s. */
export function startIdle(anim: OakAnimValues, delay = 0) {
  anim.bodyRotate.set(withDelay(delay, swingLoop(IDLE_SWAY_DEG, IDLE_PERIOD_MS)));
}

/** The canopy layers sway out of sync (different periods), which reads as depth. */
function startCanopySway(anim: OakAnimValues, delay: number, withShake: boolean) {
  const front = swingLoop(CANOPY_SWAY_DEG, CANOPY_FRONT_PERIOD_MS);
  const back = swingLoop(CANOPY_SWAY_DEG, CANOPY_BACK_PERIOD_MS);
  if (!withShake) {
    anim.canopyFrontRotate.set(withDelay(delay, front));
    anim.canopyBackRotate.set(withDelay(delay, back));
    return;
  }
  anim.canopyFrontRotate.set(
    withDelay(delay, withSequence(timing(4, 150), timing(-3, 200), timing(1, 200), timing(0, 150), front)),
  );
  anim.canopyBackRotate.set(
    withDelay(delay + 60, withSequence(timing(-2.5, 200), timing(2, 250), timing(0, 200), back)),
  );
}

/** The stage's own reaction to being watered (or to appearing, after growth). */
export function startReaction(anim: OakAnimValues, reaction: OakReaction, delay: number) {
  switch (reaction) {
    case 'wiggle':
      anim.acornRotate.set(
        withDelay(delay, withSequence(timing(-8, 150), timing(8, 200), timing(-4, 150), timing(0, 100))),
      );
      return;
    case 'perk':
      for (let i = 0; i < LEAF_GROUP_COUNT; i++) {
        const at = delay + i * 150;
        anim.leafRotate[i].set(withDelay(at, withSequence(timing(-7, 300), timing(3, 250), timing(0, 250))));
        anim.leafScale[i].set(withDelay(at, withSequence(timing(1.08, 300), timing(1, 250))));
      }
      return;
    case 'sway':
      startCanopySway(anim, delay, true);
      return;
    case 'swayAcorns':
      startCanopySway(anim, delay, true);
      for (let i = 0; i < ACORN_COUNT; i++) {
        anim.acornY[i].set(
          withDelay(
            delay + 120 + i * 90,
            withSequence(timing(-3, 150, Easing.out(Easing.quad)), timing(0, 300, Easing.bounce)),
          ),
        );
      }
      return;
  }
}

/** Endless parts of a reaction, for a state that's already settled (skip, reduced motion off). */
export function startSettledLoops(anim: OakAnimValues, reaction: OakReaction) {
  startIdle(anim);
  if (reaction === 'sway' || reaction === 'swayAcorns') startCanopySway(anim, 0, false);
}

/** Every part back at rest (assigning a plain value cancels a running animation). */
export function settle(anim: OakAnimValues, soilWet: number) {
  const rest: [SharedValue<number>, number][] = [
    [anim.soilWet, soilWet],
    [anim.bodyRotate, 0],
    [anim.bodyScaleX, 1],
    [anim.bodyScaleY, 1],
    [anim.acornRotate, 0],
    [anim.canopyBackRotate, 0],
    [anim.canopyFrontRotate, 0],
    ...anim.leafRotate.map((value): [SharedValue<number>, number] => [value, 0]),
    ...anim.leafScale.map((value): [SharedValue<number>, number] => [value, 1]),
    ...anim.acornY.map((value): [SharedValue<number>, number] => [value, 0]),
  ];
  rest.forEach(([value, to]) => value.set(to));
}
