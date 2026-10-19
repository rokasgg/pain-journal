import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export interface GlowPulseProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

const HALF_PERIOD_MS = 1400;
const MIN_OPACITY = 0.35;
const STATIC_OPACITY = 0.7;
// Soft blurred halo in the primary green, drawn *outside* the card's edges
// (boxShadow — cross-platform on the New Architecture). primaryDark's
// slightly brighter green reads in both light and dark mode, so no
// colour-scheme branching is needed.
const HALO_SHADOW = '0px 0px 18px 3px rgba(79, 122, 92, 0.55)';

// A soft breathing halo around its child, drawing the eye to "do this now".
// Deliberately no outline ring and no scaling — an earlier version drew an
// offset border-2 ring that pulsed in size, which read as a second, jittery
// border around the card. Only the halo's opacity breathes. Use on exactly
// one element at a time. Respects the OS reduce-motion setting (static halo).
export function GlowPulse({ active, children, className }: GlowPulseProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(withRepeat(withTiming(1, { duration: HALF_PERIOD_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(progress);
  }, [active, reduceMotion, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? STATIC_OPACITY : MIN_OPACITY + progress.value * (1 - MIN_OPACITY),
  }));

  return (
    <View className={`relative ${className ?? ''}`}>
      {active && (
        <Animated.View
          pointerEvents="none"
          // Same radius as the cards it wraps (rounded-2xl), so the halo
          // follows their exact outline.
          className="absolute inset-0 rounded-2xl"
          style={[{ boxShadow: HALO_SHADOW }, haloStyle]}
        />
      )}
      {children}
    </View>
  );
}
