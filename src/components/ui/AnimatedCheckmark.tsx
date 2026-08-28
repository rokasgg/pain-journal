import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Path, Svg } from 'react-native-svg';

import { animationConfig } from '@/constants/animationConfig';
import { colors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface AnimatedCheckmarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Solid fill inside the ring, fading in as the ring draws. Omit for a plain outline (default). */
  fillColor?: string;
  /** Checkmark stroke color. Defaults to white when fillColor is set (for contrast), otherwise `color`. */
  checkmarkColor?: string;
  /** Fires once, after both the circle and the checkmark have finished drawing. */
  onAnimationComplete?: () => void;
}

export interface AnimatedCheckmarkHandle {
  /** Jumps straight to the finished state and fires onAnimationComplete immediately —
   * for callers that want to let the user skip past the animation (e.g. a
   * fast follow-up tap) without blocking navigation on its full duration. */
  skip: () => void;
}

// Reusable success/confirmation indicator — a circle draws itself clockwise
// from 12 o'clock, then a checkmark draws itself inside it. No Lottie: both
// shapes are plain react-native-svg <Circle>/<Path> stroked with the classic
// strokeDasharray/strokeDashoffset "draw-on" trick, animated via Reanimated
// shared values. Used for onboarding's finish step and check-in save today;
// generic enough to reuse for any other save/confirm moment later (e.g. the
// physio visit log).
export const AnimatedCheckmark = forwardRef<AnimatedCheckmarkHandle, AnimatedCheckmarkProps>(
  function AnimatedCheckmark(
    {
      size = 64,
      color = colors.white,
      strokeWidth = 3,
      fillColor,
      checkmarkColor = fillColor ? colors.white : color,
      onAnimationComplete,
    }: AnimatedCheckmarkProps,
    ref,
  ) {
    const center = size / 2;
    const radius = center - strokeWidth; // keep the stroke from clipping at the edges
    const circleCircumference = 2 * Math.PI * radius;

    // Checkmark points as fractions of `size` — short leg down-left, long leg
    // up-right, the classic checkmark shape.
    const startX = size * 0.28;
    const startY = size * 0.53;
    const midX = size * 0.44;
    const midY = size * 0.68;
    const endX = size * 0.74;
    const endY = size * 0.32;
    const checkmarkPath = `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`;
    const checkmarkLength = Math.hypot(midX - startX, midY - startY) + Math.hypot(endX - midX, endY - midY);

    const circleProgress = useSharedValue(0);
    const checkmarkProgress = useSharedValue(0);
    const hasCompleted = useSharedValue(false);
    const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fires onAnimationComplete immediately — used by skip(), which should
    // never wait out the hold.
    const finishNow = () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (hasCompleted.value) return;
      hasCompleted.value = true;
      onAnimationComplete?.();
    };

    // Called once both draws finish: hold the completed checkmark on screen
    // for a beat before signalling done, so it doesn't feel like it gets cut
    // off right as it lands.
    const finishAfterHold = () => {
      if (hasCompleted.value) return;
      holdTimeoutRef.current = setTimeout(finishNow, animationConfig.holdDuration);
    };

    const play = () => {
      circleProgress.value = withTiming(
        1,
        { duration: animationConfig.circleDuration, easing: Easing.out(Easing.cubic) },
        (circleFinished) => {
          checkmarkProgress.value = withDelay(
            animationConfig.checkmarkDelay,
            withTiming(
              1,
              { duration: animationConfig.checkmarkDuration, easing: Easing.out(Easing.cubic) },
              (checkmarkFinished) => {
                if (circleFinished && checkmarkFinished) {
                  runOnJS(finishAfterHold)();
                }
              },
            ),
          );
        },
      );
    };

    useEffect(() => {
      play();
      return () => {
        cancelAnimation(circleProgress);
        cancelAnimation(checkmarkProgress);
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      };
      // Runs once per mount — this component is meant to be mounted fresh
      // for each success moment, not re-triggered via prop changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      skip: () => {
        cancelAnimation(circleProgress);
        cancelAnimation(checkmarkProgress);
        circleProgress.value = 1;
        checkmarkProgress.value = 1;
        finishNow();
      },
    }));

    const circleAnimatedProps = useAnimatedProps(() => ({
      strokeDashoffset: circleCircumference * (1 - circleProgress.value),
    }));

    // Fades in alongside the ring's own draw progress, so the fill and the
    // outline finish together instead of the fill popping in abruptly.
    const fillAnimatedProps = useAnimatedProps(() => ({
      opacity: circleProgress.value,
    }));

    const checkmarkAnimatedProps = useAnimatedProps(() => ({
      strokeDashoffset: checkmarkLength * (1 - checkmarkProgress.value),
    }));

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {fillColor && (
            <AnimatedCircle cx={center} cy={center} r={radius} fill={fillColor} animatedProps={fillAnimatedProps} />
          )}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circleCircumference} ${circleCircumference * 2}`}
            animatedProps={circleAnimatedProps}
            // Rotate so the draw starts at 12 o'clock and goes clockwise,
            // like a clock hand, instead of SVG's default 3-o'clock start.
            rotation={-90}
            origin={`${center}, ${center}`}
          />
          <AnimatedPath
            d={checkmarkPath}
            stroke={checkmarkColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            // Gap deliberately much larger than the dash (not dash == gap):
            // at dash == gap, the boundary between the hidden dash and the
            // visible one sits exactly at the path's start/end, and
            // floating-point drift between our JS-computed length and the
            // SVG engine's own path length lets the round linecap "leak" a
            // sub-pixel dot through right at the tip. A generous gap gives
            // that drift somewhere to hide.
            strokeDasharray={`${checkmarkLength} ${checkmarkLength * 2}`}
            animatedProps={checkmarkAnimatedProps}
          />
        </Svg>
      </View>
    );
  },
);
