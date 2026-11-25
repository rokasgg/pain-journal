import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { OakTree } from '@/components/OakTree';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { AnalysisStep } from '@/lib/profileAnswers';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

const LINE_INTERVAL_MS = 1000;
const DONE_HOLD_MS = 600;
const REDUCED_MOTION_HOLD_MS = 1000;

interface AnalysingAnswersProps {
  steps: AnalysisStep[];
  // The answers have been saved. The screen waits for this on its last line,
  // so a slow network holds it a little longer instead of skipping ahead.
  ready: boolean;
  onDone: () => void;
}

// Onboarding's "reading your answers" moment, between the last question and
// the starting picture. The lines come from analysisSteps() — true things
// about this user's answers — and the save really runs underneath.
export function AnalysingAnswers({ steps, ready, onDone }: AnalysingAnswersProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(reduceMotion ? steps.length : 1);
  const allRevealed = revealed >= steps.length;
  const finished = allRevealed && ready;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Reveal the lines one by one; each new one ticks the previous one off.
  useEffect(() => {
    if (allRevealed) return;
    const timer = setTimeout(() => {
      haptics.tick();
      setRevealed((n) => n + 1);
    }, LINE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [revealed, allRevealed]);

  useEffect(() => {
    if (!finished) return;
    haptics.success();
    const timer = setTimeout(() => onDoneRef.current(), reduceMotion ? REDUCED_MOTION_HOLD_MS : DONE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [finished, reduceMotion]);

  // The acorn breathes while the answers are read.
  const breath = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) breath.set(withRepeat(withTiming(1.06, { duration: 900 }), -1, true));
  }, [breath, reduceMotion]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.get() }] }));

  return (
    // Two fixed areas, so nothing moves as lines appear: the oak, title and
    // description fill the top third (centred in it); the lines grow down
    // from the top of the rest.
    <View className="flex-1 px-8">
      <View className="flex-1 items-center justify-center gap-3">
        <Animated.View style={breathStyle}>
          <OakTree stage={1} size={96} />
        </Animated.View>
        <Text className="text-center text-2xl font-bold text-black dark:text-white">
          {t('onboarding.analysing.title')}
        </Text>
        <Text className="text-center text-[15px] leading-5 text-inkSecondary dark:text-gray">
          {t('onboarding.analysing.description')}
        </Text>
      </View>
      <View className="flex-[2] gap-4 pt-4">
        {steps.slice(0, revealed).map((step, index) => {
          const done = finished || index < revealed - 1;
          return (
            <Animated.View
              key={step}
              entering={reduceMotion ? undefined : FadeInDown.duration(250)}
              className="flex-row items-center gap-3"
            >
              {/* Both layers always rendered; the state shows through opacity. */}
              <View className="h-6 w-6 items-center justify-center">
                <View className="absolute" style={{ opacity: done ? 0 : 1 }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
                <View className="absolute" style={{ opacity: done ? 1 : 0 }}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                </View>
              </View>
              <Text className="flex-1 text-[16px] text-ink dark:text-white">{t(`onboarding.analysing.${step}`)}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
