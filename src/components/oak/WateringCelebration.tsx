import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { AnimatedG, gMatrixProps, pivotMatrix, useOakAnimValues } from '@/components/oak/oakAnim';
import { OAK_STAGES, type OakPoint, type OakWateringLayout } from '@/components/oak/oakConfig';
import { settle, startIdle, startReaction, startSettledLoops, timing } from '@/components/oak/oakTimeline';
import { OAK_STAGE_COMPONENTS } from '@/components/oak/stages';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { OakStage } from '@/lib/oak';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

// The only new colours: the soft-blue watering can and its drops.
const CAN_BODY = '#8AB0C4';
const CAN_RIM = '#5E8AA0';
const DROP_COLOR = '#6FA8C8';
const DROP_PATH = 'M0 -4 C1.8 -1.6 3 0.4 3 2 A3 3 0 0 1 -3 2 C-3 0.4 -1.8 -1.6 0 -4 Z';

const CANVAS_WIDTH = 150;
const CANVAS_HEIGHT = 160;
const WET_PEAK = 0.85;
const WET_REST = 0.45;

// Timeline, ms from start (~2.7 s, then the idle loop).
const T = {
  canIn: 100,
  canInDuration: 360,
  tilt: 460,
  tiltDuration: 280,
  drops: [750, 920, 1080, 1240, 1400],
  dropDuration: 550,
  splashes: [1250, 1600, 1900],
  splashDuration: 450,
  wet: 1200,
  reaction: 1750,
  squash: 1850,
  canOut: 1850,
  canOutDuration: 250,
  title: 2100,
  subtitle: 2250,
  card: 2400,
  end: 2700,
} as const;

const EASE_OUT = Easing.out(Easing.cubic);

function WateringCan({
  layout,
  slide,
  tilt,
}: {
  layout: OakWateringLayout;
  slide: SharedValue<number>;
  tilt: SharedValue<number>;
}) {
  // slide: 0 = off to the upper right (+40, −24) and invisible, 1 = in place.
  const props = useAnimatedProps(() => {
    const s = slide.get();
    return gMatrixProps(
      pivotMatrix(0, 0, tilt.get(), 1, 1, layout.can.x + 40 * (1 - s), layout.can.y - 24 * (1 - s)),
      s,
    );
  });

  // Drawn around its own centre (0,0), which is also the tilt pivot. Tilted
  // −35°, the spout's tip lands near layout.dropFrom.
  return (
    <AnimatedG animatedProps={props}>
      <Path d="M11 -6 C19.5 -6 19.5 6 11 6" stroke={CAN_RIM} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M-10 1 L-23 -8.5 L-21.5 -11 L-8 -4 Z" fill={CAN_RIM} />
      <Ellipse cx={-23} cy={-10} rx={2.4} ry={1.5} fill={CAN_RIM} transform="rotate(-35 -23 -10)" />
      <Rect x={-12} y={-9} width={24} height={18} rx={5} fill={CAN_BODY} />
      <Rect x={-13} y={-11} width={26} height={4} rx={2} fill={CAN_RIM} />
    </AnimatedG>
  );
}

function Drop({ progress, from, to }: { progress: SharedValue<number>; from: OakPoint; to: OakPoint }) {
  const props = useAnimatedProps(() => {
    const p = progress.get();
    return gMatrixProps(
      [1, 0, 0, 1, from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p],
      p > 0 && p < 1 ? 1 : 0,
    );
  });
  return (
    <AnimatedG animatedProps={props}>
      <Path d={DROP_PATH} fill={DROP_COLOR} />
    </AnimatedG>
  );
}

function SplashRing({ progress, at }: { progress: SharedValue<number>; at: OakPoint }) {
  const props = useAnimatedProps(() => {
    const p = progress.get();
    const scale = 0.2 + 1.4 * p;
    return gMatrixProps(pivotMatrix(0, 0, 0, scale, scale, at.x, at.y), p > 0 ? 1 - p : 0);
  });
  return (
    <AnimatedG animatedProps={props}>
      <Ellipse cx={0} cy={0} rx={6} ry={2} stroke={DROP_COLOR} strokeWidth={1.2} fill="none" />
    </AnimatedG>
  );
}

function useRiseStyle(value: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: value.get(),
    transform: [{ translateY: 14 * (1 - value.get()) }],
  }));
}

// One drop per watering this stage needs. The filled layer is mounted on top
// of a stable outline (never a className swap; see the NativeWind gotcha).
// The newly earned one pops in with a spring at the end.
function ProgressDrop({ filled, isNew, pop }: { filled: boolean; isNew: boolean; pop: SharedValue<number> }) {
  const popStyle = useAnimatedStyle(() => ({ opacity: pop.get() > 0 ? 1 : 0, transform: [{ scale: pop.get() }] }));
  return (
    <View className="h-5 w-5 items-center justify-center">
      <Ionicons name="water-outline" size={18} color={colors.gray} />
      {filled && (
        <Animated.View className="absolute inset-0 items-center justify-center" style={isNew ? popStyle : undefined}>
          <Ionicons name="water" size={18} color={DROP_COLOR} />
        </Animated.View>
      )}
    </View>
  );
}

export interface WateringCelebrationProps {
  /** The one oak's stage (from check-in days). Watering never changes it. */
  stage: OakStage;
  /** Training days this week after this workout; null hides the weekly card. */
  sessions: number | null;
  /** The weekly training goal (profiles.weekly_training_goal). */
  goal: number;
  /** True when this workout added a training day (its drop pops in). */
  counted: boolean;
  onDone: () => void;
}

// After a logged workout: the can tips in, five drops water the soil, the
// oak reacts, then "Watered!" and this week's training days against the
// weekly goal (one drop each). The oak's stage comes from check-in days, so
// watering never grows it. Everything animates on the UI thread; the only JS
// work is the haptic timers and one `done` flag. Tap anywhere to skip.
export function WateringCelebration({ stage: oakStage, sessions, goal, counted, onDone }: WateringCelebrationProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const stage = OAK_STAGES[oakStage];
  const Stage = OAK_STAGE_COMPONENTS[oakStage];
  const layout = stage.water;

  const anim = useOakAnimValues();
  const canSlide = useSharedValue(0);
  const canTilt = useSharedValue(0);
  const drop0 = useSharedValue(0);
  const drop1 = useSharedValue(0);
  const drop2 = useSharedValue(0);
  const drop3 = useSharedValue(0);
  const drop4 = useSharedValue(0);
  const splash0 = useSharedValue(0);
  const splash1 = useSharedValue(0);
  const splash2 = useSharedValue(0);
  const titleIn = useSharedValue(0);
  const subtitleIn = useSharedValue(0);
  const cardIn = useSharedValue(0);
  const continueIn = useSharedValue(0);
  const pop = useSharedValue(0);
  const drops = [drop0, drop1, drop2, drop3, drop4];
  const splashes = [splash0, splash1, splash2];

  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  const titleStyle = useRiseStyle(titleIn);
  const subtitleStyle = useRiseStyle(subtitleIn);
  const cardStyle = useRiseStyle(cardIn);
  const continueStyle = useAnimatedStyle(() => ({ opacity: continueIn.get() }));

  // Jump every value to its end state. Used by tap-to-skip, by the end of
  // the timeline's JS side, and straight away under Reduce Motion.
  const finish = (withLoops: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    settle(anim, WET_REST);
    canSlide.set(0);
    canTilt.set(0);
    [...drops, ...splashes].forEach((value) => value.set(1));
    [titleIn, subtitleIn, cardIn, continueIn, pop].forEach((value) => value.set(1));
    if (withLoops) startSettledLoops(anim, stage.reaction);
    haptics.success();
    setDone(true);
  };

  useEffect(() => {
    if (reduceMotion) {
      finish(false);
      return;
    }

    canSlide.set(
      withDelay(
        T.canIn,
        withSequence(
          timing(1, T.canInDuration, EASE_OUT),
          withDelay(T.canOut - T.canIn - T.canInDuration, timing(0, T.canOutDuration)),
        ),
      ),
    );
    canTilt.set(
      withDelay(
        T.tilt,
        withSequence(
          timing(-35, T.tiltDuration),
          withDelay(T.canOut - T.tilt - T.tiltDuration, timing(0, T.canOutDuration)),
        ),
      ),
    );
    drops.forEach((value, index) =>
      value.set(withDelay(T.drops[index], timing(1, T.dropDuration, Easing.in(Easing.quad)))),
    );
    splashes.forEach((value, index) => value.set(withDelay(T.splashes[index], timing(1, T.splashDuration, EASE_OUT))));
    anim.soilWet.set(
      withDelay(T.wet, withSequence(timing(WET_PEAK, 500), timing(WET_PEAK, 300), timing(WET_REST, 1600))),
    );
    startReaction(anim, stage.reaction, T.reaction);
    anim.bodyScaleX.set(withDelay(T.squash, withSequence(timing(1.05, 150), timing(0.97, 200), timing(1, 250))));
    anim.bodyScaleY.set(withDelay(T.squash, withSequence(timing(0.95, 150), timing(1.05, 200), timing(1, 250))));
    titleIn.set(withDelay(T.title, timing(1, 450, EASE_OUT)));
    subtitleIn.set(withDelay(T.subtitle, timing(1, 450, EASE_OUT)));
    cardIn.set(withDelay(T.card, timing(1, 300, EASE_OUT)));
    continueIn.set(withDelay(T.end, timing(1, 250)));
    pop.set(withDelay(T.end, withSpring(1, { damping: 8, stiffness: 240 })));
    startIdle(anim, T.end);

    timers.current = [
      ...T.drops.map((at) => setTimeout(() => haptics.waterDrop(), at + T.dropDuration)),
      setTimeout(() => {
        finishedRef.current = true;
        haptics.success();
        setDone(true);
      }, T.end),
    ];
    return () => timers.current.forEach(clearTimeout);
    // Mounted fresh per celebration; the sequence runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => (done ? onDone() : finish(true));

  const stageName = t(stage.nameKey);
  // One drop per goal day, or more once the goal is beaten.
  const dropCount = sessions === null ? 0 : Math.max(goal, sessions);
  const newIndex = counted && sessions !== null && sessions > 0 ? sessions - 1 : null;
  const svgWidth = Math.min(width - 48, 300);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={t('oakCelebration.watered')}
      accessibilityHint={done ? undefined : t('oakCelebration.tapToSkip')}
      className="flex-1 items-center justify-between px-6"
    >
      <View className="w-full flex-1 items-center justify-center gap-3">
        <Svg
          width={svgWidth}
          height={(svgWidth * CANVAS_HEIGHT) / CANVAS_WIDTH}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        >
          <Stage anim={anim} />
          {!reduceMotion && (
            <>
              {splashes.map((value, index) => (
                <SplashRing key={index} progress={value} at={layout.dropTo} />
              ))}
              {drops.map((value, index) => (
                <Drop key={index} progress={value} from={layout.dropFrom} to={layout.dropTo} />
              ))}
              <WateringCan layout={layout} slide={canSlide} tilt={canTilt} />
            </>
          )}
        </Svg>

        <Text className="text-label font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">
          {stageName}
        </Text>
        <Animated.View style={titleStyle}>
          <Text className="text-center text-title text-black dark:text-white">{t('oakCelebration.watered')}</Text>
        </Animated.View>
        <Animated.View style={subtitleStyle}>
          <Text className="text-center text-body text-gray">
            {counted ? t('oakCelebration.wateredBody', { stage: stageName }) : t('oakCelebration.alreadyWatered')}
          </Text>
        </Animated.View>

        {sessions !== null && (
          <Animated.View style={cardStyle} className="mt-2 w-full gap-3 rounded-3xl bg-surface p-5 dark:bg-surfaceDark">
            <View className="flex-row flex-wrap justify-center gap-1.5">
              {Array.from({ length: dropCount }, (_, index) => (
                <ProgressDrop key={index} filled={index < sessions} isNew={index === newIndex} pop={pop} />
              ))}
            </View>
            <Text className="text-center text-label text-ink dark:text-white">
              {sessions >= goal
                ? t('oakCelebration.weekGoalMet', { count: sessions, total: goal })
                : t('oakCelebration.weekProgress', { count: sessions, total: goal })}
            </Text>
          </Animated.View>
        )}
      </View>

      <Animated.View style={continueStyle} className="w-full" pointerEvents={done ? 'auto' : 'none'}>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          className="items-center rounded-2xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
        >
          <Text className="text-nav text-white">{t('celebration.continue')}</Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}
