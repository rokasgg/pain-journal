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

import { colors } from '@/lib/theme';

export interface GlowPulseProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

const HALF_PERIOD_MS = 800;
const STATIC_OPACITY = 0.4;

// A soft breathing ring behind its child, drawing the eye to "do this now".
// Use on exactly one element at a time — one glowing thing is what makes the
// glow mean "this one". Respects the OS reduce-motion setting (static ring).
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

  const ringStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? STATIC_OPACITY : 0.15 + progress.value * 0.4,
    transform: [{ scale: reduceMotion ? 1 : 1 + progress.value * 0.03 }],
  }));

  return (
    <View className={`relative ${className ?? ''}`}>
      {active && (
        <Animated.View
          pointerEvents="none"
          className="absolute -inset-1 rounded-[20px] border-2 border-primary dark:border-primaryDark"
          style={[
            { shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
            ringStyle,
          ]}
        />
      )}
      {children}
    </View>
  );
}
