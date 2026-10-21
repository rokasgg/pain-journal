import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { OakTree } from '@/components/OakTree';
import { useOakStage } from '@/hooks/useOakStage';
import { useProfile } from '@/hooks/useProfile';
import { daysSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS } from '@/lib/oak';
import { colors } from '@/lib/theme';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import { useOakBadgeStore } from '@/store/useOakBadgeStore';

const OAK_SIZE = 40;
const BOUNCE_SCALE = 1.08;
const BOUNCE_HALF_MS = 125; // 1 → 1.08 → 1 in 250 ms

// Home header badge (right of "Today"): the current-stage icon oak, then the
// healing day as a big number over "day of healing". The day is calendar
// days since the healing date, 1-based (same count as Injury info), and never
// depends on check-ins. Before a healing date is set, the leaf "Set healing
// date" pill shows instead. Both open Injury info.
//
// Watering hook-up: the oak registers its ref in useOakBadgeStore so the
// watering screen can fly into it; when the celebration ends (the oak has
// "landed"), the badge bounces once.
export function DaysSinceHealing() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { stage } = useOakStage();
  const reduceMotion = useReducedMotion();
  const celebrating = useCelebrationStore((s) => s.visible);
  const healingStartedOn = profile?.healing_started_on;

  const oakRef = useRef<View>(null);
  useEffect(() => {
    if (!healingStartedOn) return;
    useOakBadgeStore.getState().setTarget(oakRef);
    return () => useOakBadgeStore.getState().setTarget(null);
  }, [healingStartedOn]);

  const scale = useSharedValue(1);
  const wasCelebratingRef = useRef(celebrating);
  useEffect(() => {
    const landed = wasCelebratingRef.current && !celebrating;
    wasCelebratingRef.current = celebrating;
    if (landed && !reduceMotion) {
      scale.set(
        withSequence(
          withTiming(BOUNCE_SCALE, { duration: BOUNCE_HALF_MS }),
          withTiming(1, { duration: BOUNCE_HALF_MS }),
        ),
      );
    }
  }, [celebrating, reduceMotion, scale]);
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!healingStartedOn) {
    return (
      <Link href={'/settings/injury-info' as Href} asChild>
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2.5 active:opacity-70"
        >
          <Ionicons name="leaf-outline" size={16} color={colors.primary} />
          <Text className="text-base font-semibold text-primary dark:text-primaryDark">{t('home.setHealingDate')}</Text>
        </Pressable>
      </Link>
    );
  }

  const day = daysSince(healingStartedOn) + 1;
  const accessibilityLabel = t('home.oakBadgeA11y', {
    day,
    stage: stage === null ? '' : t(OAK_STAGE_NAME_KEYS[stage]),
  });

  return (
    <Link href={'/settings/injury-info' as Href} asChild>
      <Pressable
        // Hidden dev affordance: preview the watering celebration without
        // completing a real check-in.
        onLongPress={() => useCelebrationStore.getState().show()}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className="min-h-11 justify-center active:opacity-70"
      >
        <Animated.View className="flex-row items-center gap-1.5" style={bounceStyle}>
          {/* Fixed box even while the stage loads, so nothing shifts. */}
          <View ref={oakRef} collapsable={false} style={{ width: OAK_SIZE, height: OAK_SIZE }}>
            {stage !== null && <OakTree stage={stage} size={OAK_SIZE} variant="icon" />}
          </View>
          <View>
            <Text className="text-[18px] font-bold text-black dark:text-white">{day}</Text>
            <Text className="text-[12px] text-gray">{t('home.healingDayLabel')}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Link>
  );
}
