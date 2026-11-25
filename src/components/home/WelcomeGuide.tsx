import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type RefObject } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useJourney } from '@/hooks/useJourney';
import type { CheckinAction } from '@/lib/checkinTiming';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { JOURNEY_MILESTONES } from '@/lib/journey';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

import { MILESTONE_LABEL_KEYS } from './JourneyCard';

export interface WelcomeGuideProps {
  visible: boolean;
  // The Home progress card this guide collapses into (and expands from).
  targetRef: RefObject<View | null>;
  // First-day evening: start with the evening check-in, morning is tomorrow.
  startWithEvening: boolean;
  // Replay from the card grows out of it; the first automatic open just
  // appears full-screen. Closing always collapses into the card.
  expandFromTarget: boolean;
  // The check-in due right now (getNowAction), or null when none is. When
  // set, the guide ends on that check-in instead of just closing, so a new
  // user's first stop after onboarding is a real first step.
  nowAction: CheckinAction | null;
  onClosed: () => void;
  // Close (plain fade, no morph) and open that check-in. The caller navigates
  // after the modal is gone (Modal-vs-navigation race).
  onStartCheckin: (action: CheckinAction) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MORPH_MS = 450;
const CONTENT_FADE_MS = 150;
const CARD_RADIUS = 16;
const MORPH_EASING = Easing.out(Easing.cubic);

const STEPS: { icon: keyof typeof Ionicons.glyphMap; key: string; action: CheckinAction | null }[] = [
  { icon: 'sunny-outline', key: 'journey.howMorning', action: 'morning' },
  { icon: 'moon-outline', key: 'journey.howEvening', action: 'evening' },
  { icon: 'flame-outline', key: 'journey.howFlareUp', action: null },
];

const PREVIEW_UNLOCKS = JOURNEY_MILESTONES.filter((m) => m.key === 'history' || m.key === 'insights');

// null when the card is missing or not fully on screen (it sits at the bottom
// of Home, so it can be below the fold) — callers then just fade, rather than
// morphing into a rect the user can't see.
function measure(ref: RefObject<View | null>, windowHeight: number): Promise<Rect | null> {
  return new Promise((resolve) => {
    const view = ref.current;
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && y >= 0 && y + height <= windowHeight ? { x, y, width, height } : null),
    );
  });
}

// Full-screen "how this works" for new users. A real <Modal> so it covers the
// tab bar too — only ever opened while navigation is idle (see the
// Modal-vs-transition race documented for ToastModalHost). On "Let's start"
// the content fades and the panel itself morphs down into the Home progress
// card's measured rect, then the modal closes over the real card, which sits
// in exactly that spot — so it reads as the guide *becoming* the card.
// Reopening from the card plays the same morph in reverse.
export function WelcomeGuide({
  visible,
  targetRef,
  startWithEvening,
  expandFromTarget,
  nowAction,
  onClosed,
  onStartCheckin,
}: WelcomeGuideProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isClosing, setIsClosing] = useState(false);
  // Shown to every account once, so an existing user may have nothing left
  // to unlock — only preview what's actually still locked.
  const { isUnlocked } = useJourney();
  const lockedPreview = PREVIEW_UNLOCKS.filter((milestone) => !isUnlocked(milestone.key));

  const top = useSharedValue(0);
  const left = useSharedValue(0);
  const width = useSharedValue(screenWidth);
  const height = useSharedValue(screenHeight);
  const radius = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const goFullScreen = (animated: boolean) => {
    const timing = (value: number) => (animated ? withTiming(value, { duration: MORPH_MS, easing: MORPH_EASING }) : value);
    top.set(timing(0));
    left.set(timing(0));
    width.set(timing(screenWidth));
    height.set(timing(screenHeight));
    radius.set(timing(0));
    contentOpacity.set(withDelay(animated ? MORPH_MS - 100 : 0, withTiming(1, { duration: 250 })));
  };

  // Opening: on replay, expand from the card; on the first automatic open,
  // just appear full-screen (the modal's own fade).
  useEffect(() => {
    if (!visible) return;
    if (!expandFromTarget) {
      goFullScreen(false);
      return;
    }
    let cancelled = false;
    measure(targetRef, screenHeight).then((rect) => {
      if (cancelled) return;
      if (rect && !reduceMotion) {
        top.set(rect.y);
        left.set(rect.x);
        width.set(rect.width);
        height.set(rect.height);
        radius.set(CARD_RADIUS);
        contentOpacity.set(0);
        goFullScreen(true);
      } else {
        goFullScreen(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const finish = () => {
    setIsClosing(false);
    onClosed();
  };

  const handleStart = async () => {
    if (isClosing) return;
    haptics.tap();
    setIsClosing(true);
    const rect = await measure(targetRef, screenHeight);
    if (!rect || reduceMotion) {
      finish();
      return;
    }
    const timing = (value: number) =>
      withDelay(CONTENT_FADE_MS - 50, withTiming(value, { duration: MORPH_MS, easing: MORPH_EASING }));
    contentOpacity.set(withTiming(0, { duration: CONTENT_FADE_MS }));
    top.set(timing(rect.y));
    left.set(timing(rect.x));
    width.set(timing(rect.width));
    radius.set(timing(CARD_RADIUS));
    height.set(
      withDelay(
        CONTENT_FADE_MS - 50,
        withTiming(rect.height, { duration: MORPH_MS, easing: MORPH_EASING }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      ),
    );
  };

  const handleStartCheckin = () => {
    if (isClosing || !nowAction) return;
    haptics.tap();
    onStartCheckin(nowAction);
  };

  const frameStyle = useAnimatedStyle(() => ({
    top: top.value,
    left: left.value,
    width: width.value,
    height: height.value,
    borderRadius: radius.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={handleStart}>
      <Animated.View className="absolute overflow-hidden bg-surface dark:bg-surfaceDark" style={frameStyle}>
        <Animated.View
          className="flex-1 justify-between px-6"
          style={[{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, width: screenWidth }, contentStyle]}
        >
          <View className="gap-8">
            <Animated.View entering={FadeInDown.duration(400)} className="gap-2">
              <Text className="text-3xl font-bold text-black dark:text-white">{t('journey.welcomeTitle')}</Text>
              <Text className="text-base text-strongGray dark:text-white">
                {t(startWithEvening ? 'journey.welcomeStartEvening' : 'journey.welcomeIntro')}
              </Text>
            </Animated.View>

            <View className="gap-4">
              {STEPS.map((step, index) => (
                <Animated.View
                  key={step.key}
                  entering={FadeInDown.delay(150 + index * 120).duration(400)}
                  className="flex-row items-center gap-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-primaryMuted dark:bg-primaryMutedDark">
                    <Ionicons name={step.icon} size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1 gap-1">
                    {step.action !== null && step.action === nowAction && (
                      <View className="self-start rounded-full bg-accentMuted px-2.5 py-0.5 dark:bg-primaryMutedDark">
                        <Text className="text-caption font-semibold text-accent dark:text-white">
                          {t('journey.welcomeNowTag')}
                        </Text>
                      </View>
                    )}
                    <Text className="text-base text-black dark:text-white">{t(step.key)}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {lockedPreview.length > 0 && (
              <Animated.View entering={FadeInDown.delay(550).duration(400)} className="gap-3">
                <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
                  {t('journey.welcomeUnlocksTitle')}
                </Text>
                {lockedPreview.map((milestone) => (
                  <View key={milestone.key} className="flex-row items-center gap-3">
                    <Ionicons name="lock-closed" size={16} color={colors.gray} />
                    <Text className="text-base text-strongGray dark:text-white">
                      {t('journey.welcomeUnlockRow', { feature: t(MILESTONE_LABEL_KEYS[milestone.key]), days: milestone.days })}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>

          {nowAction ? (
            <View className="gap-2">
              <Pressable
                onPress={handleStartCheckin}
                disabled={isClosing}
                accessibilityRole="button"
                className="items-center rounded-xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
              >
                <Text className="text-base font-semibold text-white">
                  {t(nowAction === 'evening' ? 'journey.welcomeStartEveningCta' : 'journey.welcomeStartMorningCta')}
                </Text>
              </Pressable>
              <Pressable onPress={handleStart} disabled={isClosing} accessibilityRole="button" className="items-center py-3">
                <Text className="text-base font-semibold text-primary dark:text-white">
                  {t('journey.welcomeLookAround')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleStart}
              disabled={isClosing}
              accessibilityRole="button"
              className="items-center rounded-xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
            >
              <Text className="text-base font-semibold text-white">{t('journey.welcomeCta')}</Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
