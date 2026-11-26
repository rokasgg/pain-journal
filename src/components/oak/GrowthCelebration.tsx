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
import Svg, { Circle, Path } from 'react-native-svg';

import { AnimatedG, gMatrixProps, pivotMatrix, useOakAnimValues, useOpacityProps } from '@/components/oak/oakAnim';
import { OAK_STAGES } from '@/components/oak/oakConfig';
import { settle, startSettledLoops, timing } from '@/components/oak/oakTimeline';
import { OAK_STAGE_COMPONENTS } from '@/components/oak/stages';
import { OAK_LEAF_PATH } from '@/components/oak/stages/OakParts';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

// A wider canvas than the oak's own 120×160, so the glow, the flash and the
// leaf burst have room around it. The oak still sits at x 0–120, y 0–160.
const VIEW_BOX = { x: -45, y: -30, width: 210, height: 200 };
const CENTER = { x: 60, y: 100 };
const GLOW_COLOR = '#E3EBD9';
const LEAF_COLORS = ['#5E8F6B', '#8DBB97', '#C49A5A'];
const LEAF_COUNT = 8;
const BURST_DISTANCE = 75;
const WET_REST = 0;

const T = {
  glow: 0,
  wiggle: 100,
  shrink: 1100,
  flash: 1150,
  newStage: 1250,
  burst: 1350,
  burstDuration: 1350,
  eyebrow: 1800,
  title: 1875,
  body: 1950,
  track: 2100,
  dotPop: 2400,
  end: 2600,
} as const;

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

function useRiseStyle(value: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: value.get(),
    transform: [{ translateY: 14 * (1 - value.get()) }],
  }));
}

// The five stages as dots with names. Filled dots are layers on a stable
// outline (no className swap); the new stage's dot pops in with a spring.
function StageTrack({ stageIndex, pop }: { stageIndex: number; pop: SharedValue<number> }) {
  const { t } = useTranslation();
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }], opacity: pop.get() > 0 ? 1 : 0 }));

  return (
    <View className="w-full flex-row">
      {OAK_STAGES.map((stage, index) => (
        <View key={stage.key} className="flex-1 items-center gap-1.5">
          <View className="h-3.5 w-3.5 rounded-full border-2 border-borderLight dark:border-borderDark">
            {index < stageIndex && <View className="absolute -inset-0.5 rounded-full bg-primary dark:bg-primaryDark" />}
            {index === stageIndex && (
              <Animated.View
                style={popStyle}
                className="absolute -inset-0.5 rounded-full bg-primary dark:bg-primaryDark"
              />
            )}
          </View>
          <Text
            numberOfLines={2}
            className={`text-center text-caption ${index === stageIndex ? 'font-semibold text-black dark:text-white' : 'text-gray'}`}
          >
            {t(stage.nameKey)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface GrowthCelebrationProps {
  fromStageIndex: number;
  stageIndex: number;
  onDone: () => void;
}

// Shown instead of the watering when a workout crosses a stage threshold:
// the old stage gathers itself, a flash, the new stage springs in with a
// burst of oak leaves, then "Your oak grew!" and the stage track.
// UI-thread animations only; tap anywhere to skip.
export function GrowthCelebration({ fromStageIndex, stageIndex, onDone }: GrowthCelebrationProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const OldStage = OAK_STAGE_COMPONENTS[fromStageIndex];
  const NewStage = OAK_STAGE_COMPONENTS[stageIndex];
  const newStage = OAK_STAGES[stageIndex];

  const oldAnim = useOakAnimValues();
  const newAnim = useOakAnimValues();
  const oldOpacity = useSharedValue(1);
  const newOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const flash = useSharedValue(0);
  const leaf0 = useSharedValue(0);
  const leaf1 = useSharedValue(0);
  const leaf2 = useSharedValue(0);
  const leaf3 = useSharedValue(0);
  const leaf4 = useSharedValue(0);
  const leaf5 = useSharedValue(0);
  const leaf6 = useSharedValue(0);
  const leaf7 = useSharedValue(0);
  const eyebrowIn = useSharedValue(0);
  const titleIn = useSharedValue(0);
  const bodyIn = useSharedValue(0);
  const trackIn = useSharedValue(0);
  const dotPop = useSharedValue(0);
  const continueIn = useSharedValue(0);
  const leaves = [leaf0, leaf1, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7];

  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  const oldProps = useOpacityProps(oldOpacity);
  const newProps = useOpacityProps(newOpacity);
  const glowProps = useAnimatedProps(() => {
    // 0 → 0.6: scale 0.5 → 1.08; 0.6 → 1: settle to 1.
    const g = glow.get();
    const scale = g < 0.6 ? 0.5 + (0.58 * g) / 0.6 : 1.08 - (0.08 * (g - 0.6)) / 0.4;
    return gMatrixProps(pivotMatrix(CENTER.x, CENTER.y, 0, scale, scale), Math.min(1, g * 2));
  });
  const flashProps = useAnimatedProps(() => {
    const f = flash.get();
    const scale = 4.5 * f;
    return gMatrixProps(
      pivotMatrix(CENTER.x, CENTER.y, 0, scale, scale),
      f <= 0 || f >= 1 ? 0 : f < 0.1 ? 0.95 : 0.95 * (1 - (f - 0.1) / 0.9),
    );
  });
  const eyebrowStyle = useRiseStyle(eyebrowIn);
  const titleStyle = useRiseStyle(titleIn);
  const bodyStyle = useRiseStyle(bodyIn);
  const trackStyle = useAnimatedStyle(() => ({ opacity: trackIn.get() }));
  const continueStyle = useAnimatedStyle(() => ({ opacity: continueIn.get() }));

  const finish = (withLoops: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    settle(oldAnim, WET_REST);
    settle(newAnim, WET_REST);
    oldOpacity.set(0);
    newOpacity.set(1);
    glow.set(1);
    flash.set(1);
    leaves.forEach((value) => value.set(1));
    [eyebrowIn, titleIn, bodyIn, trackIn, dotPop, continueIn].forEach((value) => value.set(1));
    if (withLoops) startSettledLoops(newAnim, newStage.reaction);
    haptics.success();
    setDone(true);
  };

  useEffect(() => {
    if (reduceMotion) {
      finish(false);
      return;
    }

    newAnim.bodyScaleX.set(0.5);
    newAnim.bodyScaleY.set(0.5);

    glow.set(withDelay(T.glow, timing(1, 900, EASE_OUT)));

    // Old stage: an anticipation wiggle while it swells to 1.1, then it
    // shrinks to 0.8 and fades.
    oldAnim.bodyRotate.set(
      withDelay(
        T.wiggle,
        withSequence(timing(3, 125), timing(-3, 250), timing(3, 250), timing(-3, 250), timing(0, 125)),
      ),
    );
    const oldScale = () =>
      withDelay(T.wiggle, withSequence(timing(1.1, T.shrink - T.wiggle), timing(0.8, 250, Easing.in(Easing.quad))));
    oldAnim.bodyScaleX.set(oldScale());
    oldAnim.bodyScaleY.set(oldScale());
    oldOpacity.set(withDelay(T.shrink, timing(0, 250)));

    flash.set(withDelay(T.flash, timing(1, 550, Easing.out(Easing.quad))));

    // New stage springs in: 0.5 → 1.12 → 0.96 → 1.
    newOpacity.set(withDelay(T.newStage, timing(1, 150)));
    const newScale = () =>
      withDelay(T.newStage, withSequence(timing(1.12, 250, EASE_OUT), timing(0.96, 200), timing(1, 200)));
    newAnim.bodyScaleX.set(newScale());
    newAnim.bodyScaleY.set(newScale());

    leaves.forEach((value) => value.set(withDelay(T.burst, timing(1, T.burstDuration, Easing.linear))));

    eyebrowIn.set(withDelay(T.eyebrow, timing(1, 300, EASE_OUT)));
    titleIn.set(withDelay(T.title, timing(1, 300, EASE_OUT)));
    bodyIn.set(withDelay(T.body, timing(1, 300, EASE_OUT)));
    trackIn.set(withDelay(T.track, timing(1, 300)));
    dotPop.set(withDelay(T.dotPop, withSpring(1, { damping: 8, stiffness: 240 })));
    continueIn.set(withDelay(T.end, timing(1, 250)));

    timers.current = [
      setTimeout(() => haptics.grow(), T.flash),
      setTimeout(() => haptics.success(), T.dotPop),
      setTimeout(() => {
        finishedRef.current = true;
        startSettledLoops(newAnim, newStage.reaction);
        setDone(true);
      }, T.end),
    ];
    return () => timers.current.forEach(clearTimeout);
    // Mounted fresh per celebration; the sequence runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => (done ? onDone() : finish(true));
  const stageName = t(newStage.nameKey);
  const svgWidth = Math.min(width - 48, 320);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={t('oakCelebration.grewTitle')}
      accessibilityHint={done ? undefined : t('oakCelebration.tapToSkip')}
      className="flex-1 items-center justify-between px-6"
    >
      <View className="w-full flex-1 items-center justify-center gap-3">
        <Svg
          width={svgWidth}
          height={(svgWidth * VIEW_BOX.height) / VIEW_BOX.width}
          viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`}
        >
          <AnimatedG animatedProps={glowProps}>
            <Circle cx={CENTER.x} cy={CENTER.y} r={58} fill={GLOW_COLOR} />
          </AnimatedG>
          {!reduceMotion && (
            <AnimatedG animatedProps={oldProps}>
              <OldStage anim={oldAnim} />
            </AnimatedG>
          )}
          <AnimatedG animatedProps={newProps}>
            <NewStage anim={newAnim} />
          </AnimatedG>
          {!reduceMotion && (
            <>
              <AnimatedG animatedProps={flashProps}>
                <Circle cx={CENTER.x} cy={CENTER.y} r={14} fill="#FFFFFF" />
              </AnimatedG>
              {leaves.map((value, index) => (
                <BurstLeaf key={index} index={index} progress={value} />
              ))}
            </>
          )}
        </Svg>

        <Animated.View style={eyebrowStyle}>
          <Text className="text-label font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">
            {t('oakCelebration.newStage')}
          </Text>
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text className="text-center text-title text-black dark:text-white">{t('oakCelebration.grewTitle')}</Text>
        </Animated.View>
        <Animated.View style={bodyStyle}>
          <Text className="text-center text-body text-gray">{t('oakCelebration.grewBody', { stage: stageName })}</Text>
        </Animated.View>

        <Animated.View style={trackStyle} className="mt-4 w-full">
          <StageTrack stageIndex={stageIndex} pop={dotPop} />
        </Animated.View>
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
