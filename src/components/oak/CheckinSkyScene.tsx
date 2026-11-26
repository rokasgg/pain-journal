import { useEffect } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';
import {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, Rect } from 'react-native-svg';

import { OAK_GROWTH_DURATION_MS, OakGrowthLayer } from '@/components/oak/OakGrowthLayer';
import { AnimatedG, gMatrixProps, pivotMatrix, useOakAnimValues, useOpacityProps } from '@/components/oak/oakAnim';
import { OAK_STAGES, type OakPoint } from '@/components/oak/oakConfig';
import { startIdle, startReaction, startSettledLoops, timing } from '@/components/oak/oakTimeline';
import { OAK_STAGE_COMPONENTS } from '@/components/oak/stages';
import type { OakStage } from '@/lib/oak';
import { colors } from '@/lib/theme';
import { CELEBRATION_PEAK_MS } from '@/store/useCelebrationStore';

export type SkyVariant = 'morning' | 'evening' | 'dayComplete';

// The oak sits at x 0–120 as always; the wider box gives the sun, the moon
// and the growth burst room around it.
const VIEW_BOX = { x: -20, y: -10, width: 160, height: 170 };
// Everything in the sky is clipped above the soil line, so the sun rises
// from behind the ground instead of showing through it.
const HORIZON_Y = 141;

const SUN_FROM: OakPoint = { x: 104, y: 160 };
const SUN_TO: OakPoint = { x: 104, y: 20 };
const SETTING_SUN_FROM: OakPoint = { x: 4, y: 66 };
const SETTING_SUN_TO: OakPoint = { x: 4, y: 160 };
const MOON_TO: OakPoint = { x: 16, y: 22 };
const MOON_OFFSET: OakPoint = { x: -26, y: -34 };
const RAY_COUNT = 8;

const STARS: readonly (OakPoint & { r: number })[] = [
  { x: 52, y: 0, r: 1.3 },
  { x: 92, y: 10, r: 1.6 },
  { x: 118, y: 34, r: 1.2 },
  { x: -6, y: 58, r: 1.2 },
  { x: 128, y: 74, r: 1.5 },
  { x: 40, y: 20, r: 1 },
];
// Offsets from the crown, plus a per-firefly loop length and phase.
const FIREFLIES: readonly { dx: number; dy: number; period: number; seed: number }[] = [
  { dx: -30, dy: 6, period: 7000, seed: 0 },
  { dx: 28, dy: -8, period: 8200, seed: 1.7 },
  { dx: -14, dy: -22, period: 9000, seed: 3.1 },
  { dx: 36, dy: 18, period: 7600, seed: 4.4 },
  { dx: 4, dy: 28, period: 8800, seed: 5.6 },
];

const T = {
  rise: 100,
  riseDuration: CELEBRATION_PEAK_MS - 100,
  rays: CELEBRATION_PEAK_MS - 400,
  glow: CELEBRATION_PEAK_MS - 500,
  setSun: 0,
  setSunDuration: 900,
  moon: 200,
  stars: 500,
  fireflies: CELEBRATION_PEAK_MS,
  growth: CELEBRATION_PEAK_MS + 400,
} as const;

const EASE_OUT = Easing.out(Easing.cubic);
const LINEAR = Easing.linear;

function lerp(a: number, b: number, p: number) {
  'worklet';
  return a + (b - a) * p;
}

function Sun({
  progress,
  rays,
  spin,
  from,
  to,
  radius,
}: {
  progress: SharedValue<number>;
  rays: SharedValue<number>;
  spin: SharedValue<number>;
  from: OakPoint;
  to: OakPoint;
  radius: number;
}) {
  const props = useAnimatedProps(() => {
    const p = progress.get();
    return gMatrixProps([1, 0, 0, 1, lerp(from.x, to.x, p), lerp(from.y, to.y, p)]);
  });
  const rayProps = useAnimatedProps(() => gMatrixProps(pivotMatrix(0, 0, spin.get()), rays.get()));

  return (
    <AnimatedG animatedProps={props}>
      <AnimatedG animatedProps={rayProps}>
        {Array.from({ length: RAY_COUNT }, (_, index) => {
          const angle = (index / RAY_COUNT) * Math.PI * 2;
          const inner = radius + 3;
          const outer = radius + 8;
          return (
            <Line
              key={index}
              x1={Math.cos(angle) * inner}
              y1={Math.sin(angle) * inner}
              x2={Math.cos(angle) * outer}
              y2={Math.sin(angle) * outer}
              stroke={colors.sunRay}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </AnimatedG>
      <Circle cx={0} cy={0} r={radius} fill={colors.sun} />
      <Circle cx={-radius * 0.3} cy={-radius * 0.3} r={radius * 0.45} fill="#FFFFFF" opacity={0.22} />
    </AnimatedG>
  );
}

// A crescent: a pale disc with a sky-coloured disc laid over its upper right.
// The screen behind it is painted the same flat sky colour (useSkyColor), so
// this reads as a real crescent.
function Moon({ progress, skyColor }: { progress: SharedValue<number>; skyColor: string }) {
  const props = useAnimatedProps(() => {
    const p = progress.get();
    return gMatrixProps([1, 0, 0, 1, MOON_TO.x + MOON_OFFSET.x * (1 - p), MOON_TO.y + MOON_OFFSET.y * (1 - p)], p);
  });
  return (
    <AnimatedG animatedProps={props}>
      <Circle cx={0} cy={0} r={11} fill={colors.moon} />
      <Circle cx={5.5} cy={-4} r={9.5} fill={skyColor} />
    </AnimatedG>
  );
}

function Star({ star, twinkle, color }: { star: (typeof STARS)[number]; twinkle: SharedValue<number>; color: string }) {
  const props = useOpacityProps(twinkle);
  return (
    <AnimatedG animatedProps={props}>
      <Circle cx={star.x} cy={star.y} r={star.r} fill={color} />
    </AnimatedG>
  );
}

function Firefly({
  firefly,
  crown,
  phase,
  appear,
  color,
}: {
  firefly: (typeof FIREFLIES)[number];
  crown: OakPoint;
  phase: SharedValue<number>;
  appear: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const f = phase.get() * Math.PI * 2;
    const x = crown.x + firefly.dx + 9 * Math.sin(f + firefly.seed);
    const y = crown.y + firefly.dy + 6 * Math.sin(2 * f + firefly.seed * 1.3);
    const glow = 0.55 + 0.45 * Math.sin(3 * f + firefly.seed);
    return gMatrixProps([1, 0, 0, 1, x, y], appear.get() * glow);
  });
  return (
    <AnimatedG animatedProps={props}>
      <Circle cx={0} cy={0} r={4} fill={color} opacity={0.3} />
      <Circle cx={0} cy={0} r={1.5} fill={color} />
    </AnimatedG>
  );
}

export interface CheckinSkySceneProps {
  variant: SkyVariant;
  stageBefore: OakStage;
  stageAfter: OakStage;
  /** Jump to the end state (tap-to-skip); the loops keep running. */
  skipped: boolean;
  reduceMotion: boolean;
}

// The check-in moment: "you showed up today". Morning brings the sun up
// over the oak; evening brings the moon, stars and fireflies; a completed
// day sets the sun first. At CELEBRATION_PEAK_MS (when the host's chime,
// haptics and headline land) the oak reacts, and on a milestone it grows
// (OakGrowthLayer). Everything animates on the UI thread.
/**
 * The sky colour for a check-in moment: warm for morning, cool for evening
 * and a completed day. The celebration screen paints its whole background
 * with it, so the scene has no box of its own and blends into the page.
 */
export function useSkyColor(variant: SkyVariant): string {
  const dark = useColorScheme() === 'dark';
  if (variant === 'morning') return dark ? colors.skyMorningDark : colors.skyMorning;
  return dark ? colors.skyEveningDark : colors.skyEvening;
}

export function CheckinSkyScene({ variant, stageBefore, stageAfter, skipped, reduceMotion }: CheckinSkySceneProps) {
  const { width, height } = useWindowDimensions();
  const dark = useColorScheme() === 'dark';
  const grows = stageAfter > stageBefore && !reduceMotion;
  const finalStage = stageAfter;
  const isMorning = variant === 'morning';
  const skyColor = useSkyColor(variant);
  const starColor = dark ? colors.starDark : colors.star;
  const fireflyColor = dark ? colors.fireflyDark : colors.firefly;
  const crown = OAK_STAGES[finalStage].crown;

  const fromAnim = useOakAnimValues();
  const toAnim = useOakAnimValues();
  const sun = useSharedValue(0);
  const rays = useSharedValue(0);
  const spin = useSharedValue(0);
  const glow = useSharedValue(0);
  const settingSun = useSharedValue(0);
  const moon = useSharedValue(0);
  const star0 = useSharedValue(0);
  const star1 = useSharedValue(0);
  const star2 = useSharedValue(0);
  const star3 = useSharedValue(0);
  const star4 = useSharedValue(0);
  const star5 = useSharedValue(0);
  const flyPhase0 = useSharedValue(0);
  const flyPhase1 = useSharedValue(0);
  const flyPhase2 = useSharedValue(0);
  const flyPhase3 = useSharedValue(0);
  const flyPhase4 = useSharedValue(0);
  const flyAppear = useSharedValue(0);
  const stars = [star0, star1, star2, star3, star4, star5];
  const flyPhases = [flyPhase0, flyPhase1, flyPhase2, flyPhase3, flyPhase4];

  const glowProps = useAnimatedProps(() => {
    const g = glow.get();
    const scale = 0.6 + 0.4 * g;
    return gMatrixProps(pivotMatrix(crown.x, crown.y, 0, scale, scale), 0.7 * g);
  });
  // The setting sun (day complete) has no rays.
  const noRays = useSharedValue(0);

  // The endless parts: ray spin, star twinkle, firefly wander. Started once
  // the moment lands, or straight away after a skip.
  const startSkyLoops = (delay: number) => {
    spin.set(withDelay(delay, withRepeat(timing(360, 24000, LINEAR), -1)));
    stars.forEach((value, index) =>
      value.set(
        withDelay(
          delay + index * 260,
          withRepeat(withSequence(timing(1, 900 + index * 120), timing(0.35, 900 + index * 120)), -1),
        ),
      ),
    );
    flyPhases.forEach((value, index) =>
      value.set(withDelay(delay, withRepeat(timing(1, FIREFLIES[index].period, LINEAR), -1))),
    );
  };

  useEffect(() => {
    if (reduceMotion) {
      sun.set(1);
      rays.set(1);
      glow.set(1);
      settingSun.set(1);
      moon.set(1);
      stars.forEach((value) => value.set(0.8));
      flyAppear.set(1);
      return;
    }

    if (isMorning) {
      sun.set(withDelay(T.rise, timing(1, T.riseDuration, EASE_OUT)));
      rays.set(withDelay(T.rays, timing(1, 400)));
      glow.set(withDelay(T.glow, timing(1, 800, EASE_OUT)));
    } else {
      if (variant === 'dayComplete') {
        settingSun.set(withDelay(T.setSun, timing(1, T.setSunDuration, Easing.in(Easing.quad))));
      } else {
        settingSun.set(1);
      }
      moon.set(withDelay(T.moon, timing(1, CELEBRATION_PEAK_MS - T.moon, EASE_OUT)));
      stars.forEach((value, index) => value.set(withDelay(T.stars + index * 90, timing(0.8, 400))));
      flyAppear.set(withDelay(T.fireflies, timing(1, 700)));
    }
    startSkyLoops(isMorning ? T.rays : T.stars + 600);

    startReaction(fromAnim, OAK_STAGES[stageBefore].reaction, CELEBRATION_PEAK_MS);
    if (grows) {
      startIdle(toAnim, T.growth + OAK_GROWTH_DURATION_MS);
    } else {
      startIdle(fromAnim, CELEBRATION_PEAK_MS + 800);
    }
    // Mounted fresh per celebration; the sequence runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skipped || reduceMotion) return;
    sun.set(1);
    rays.set(1);
    glow.set(1);
    settingSun.set(1);
    moon.set(1);
    flyAppear.set(1);
    startSkyLoops(0);
    startSettledLoops(grows ? toAnim : fromAnim, OAK_STAGES[finalStage].reaction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipped]);

  const FinalStage = OAK_STAGE_COMPONENTS[finalStage];
  // Short screens only (iPhone SE and similar, under 700pt): the scene
  // shrinks to ~30% of the screen height, so the text and stats under it
  // never reach the Continue button. Regular phones keep the full size.
  const SHORT_SCREEN_HEIGHT = 700;
  const maxWidth = height < SHORT_SCREEN_HEIGHT ? (height * 0.3 * VIEW_BOX.width) / VIEW_BOX.height : 250;
  const svgWidth = Math.min(width - 48, 250, maxWidth);

  return (
    <Svg
      width={svgWidth}
      height={(svgWidth * VIEW_BOX.height) / VIEW_BOX.width}
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`}
    >
      <Defs>
        <ClipPath id="checkin-sky-above-ground">
          <Rect x={VIEW_BOX.x} y={VIEW_BOX.y} width={VIEW_BOX.width} height={HORIZON_Y - VIEW_BOX.y} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#checkin-sky-above-ground)">
        {isMorning ? (
          <>
            <AnimatedG animatedProps={glowProps}>
              <Circle cx={crown.x} cy={crown.y} r={34} fill={colors.sunGlow} />
            </AnimatedG>
            <Sun progress={sun} rays={rays} spin={spin} from={SUN_FROM} to={SUN_TO} radius={11} />
          </>
        ) : (
          <>
            {stars.map((value, index) => (
              <Star key={index} star={STARS[index]} twinkle={value} color={starColor} />
            ))}
            <Moon progress={moon} skyColor={skyColor} />
            {variant === 'dayComplete' && (
              <Sun
                progress={settingSun}
                rays={noRays}
                spin={spin}
                from={SETTING_SUN_FROM}
                to={SETTING_SUN_TO}
                radius={8}
              />
            )}
          </>
        )}
      </G>

      {grows ? (
        <OakGrowthLayer
          from={stageBefore}
          to={stageAfter}
          fromAnim={fromAnim}
          toAnim={toAnim}
          startAt={T.growth}
          skipped={skipped}
        />
      ) : (
        <FinalStage anim={fromAnim} />
      )}

      {!isMorning &&
        FIREFLIES.map((firefly, index) => (
          <Firefly
            key={index}
            firefly={firefly}
            crown={crown}
            phase={flyPhases[index]}
            appear={flyAppear}
            color={fireflyColor}
          />
        ))}
    </Svg>
  );
}
