import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlowPulse } from '@/components/ui/GlowPulse';

import { useJourney } from '@/hooks/useJourney';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { EVENING_UNLOCK_HOUR, getNowAction, isMorningOptionalToday, type CheckinAction } from '@/lib/checkinTiming';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { hourToTime } from '@/lib/time';

type RowState = 'done' | 'locked' | 'ready';

const ROW_META: Record<
  CheckinAction,
  { icon: keyof typeof Ionicons.glyphMap; tile: string; iconColor: string; titleKey: string; href: '/checkin/morning' | '/checkin/evening' }
> = {
  morning: {
    icon: 'sunny-outline',
    tile: 'bg-amber-100 dark:bg-amber-950',
    iconColor: '#d97706',
    titleKey: 'home.morningCheckin',
    href: '/checkin/morning',
  },
  evening: {
    icon: 'moon-outline',
    tile: 'bg-indigo-100 dark:bg-indigo-950',
    iconColor: '#4f46e5',
    titleKey: 'home.eveningCheckin',
    href: '/checkin/evening',
  },
};

// Re-renders once a minute so the "in 3 h 51 min" countdown stays current.
function useMinuteTick() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

const SHIMMER_WIDTH = 28;
const SHIMMER_SWEEP_MS = 900;
const SHIMMER_PAUSE_MS = 2200;

// A soft white band that sweeps across the pill every few seconds — the
// "glitter" on the check-in that's due right now. Off with reduced motion.
function Shimmer({ width }: { width: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || width === 0) return;
    progress.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: SHIMMER_SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(SHIMMER_PAUSE_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, width, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -SHIMMER_WIDTH + progress.value * (width + SHIMMER_WIDTH * 2) },
      { skewX: '-20deg' },
    ],
  }));

  if (reduceMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute bottom-0 top-0 bg-white/35"
      style={[{ width: SHIMMER_WIDTH }, style]}
    />
  );
}

// "Start" pill. The check-in due right now glows and shimmers, so the eye
// lands on it without tinting the whole row.
function StartButton({ glowing }: { glowing: boolean }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);

  return (
    <GlowPulse active={glowing} radiusClassName="rounded-full">
      <View
        className="overflow-hidden rounded-full bg-primary px-4 py-2 dark:bg-primaryDark"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Text className="text-sm font-semibold text-white">{t('home.start')}</Text>
        {glowing && <Shimmer width={width} />}
      </View>
    </GlowPulse>
  );
}

interface CheckinRowProps {
  kind: CheckinAction;
  state: RowState;
  subtitle: string;
  accessory: ReactNode;
  isLast?: boolean;
}

function CheckinRow({ kind, state, subtitle, accessory, isLast }: CheckinRowProps) {
  const { t } = useTranslation();
  const meta = ROW_META[kind];

  const content = (
    <View className="flex-row items-center gap-3.5 pl-4">
      <View className={`h-11 w-11 items-center justify-center rounded-xl ${meta.tile}`}>
        <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
      </View>
      <View
        className={`flex-1 flex-row items-center gap-3 py-4 pr-4 ${isLast ? '' : 'border-b border-borderLight dark:border-borderDark'
          }`}
      >
        <View className="flex-1 justify-center gap-0.5">
          <Text className="text-base font-semibold text-black dark:text-white">{t(meta.titleKey)}</Text>
          <Text className="text-sm text-gray">{subtitle}</Text>
        </View>
        {accessory}
      </View>
    </View>
  );

  // Only a ready check-in is tappable (done rows just show Done, by decision).
  if (state !== 'ready') return content;
  return (
    <Link href={meta.href} asChild>
      <Pressable accessibilityRole="button" className="active:opacity-70">
        {content}
      </Pressable>
    </Link>
  );
}

// Today's two check-ins in one card (design from assets/possible-app-design/home).
// Done → filled ✓; evening before it opens → "Opens at 16:00" + countdown chip;
// ready → "Start". Both rows share one background; the one that's due right
// now (getNowAction) has a glowing, shimmering Start pill. A brand-new user in the evening
// sees the morning one as "optional today" (still startable, never nudged).
export function CheckinStatusCard() {
  const { t } = useTranslation();
  const { morningDone, eveningDone, eveningUnlocked } = useTodayStatus();
  const { state: journey } = useJourney();
  const now = useMinuteTick();
  const hour = now.getHours();

  const nowAction = getNowAction({ hour, morningDone, eveningDone });
  const morningOptional = !morningDone && isMorningOptionalToday({ hour, loggedDays: journey.loggedDays });

  const unlockAt = new Date(now);
  unlockAt.setHours(EVENING_UNLOCK_HOUR, 0, 0, 0);
  const minutesLeft = Math.max(Math.ceil((unlockAt.getTime() - now.getTime()) / 60_000), 0);
  const countdown =
    minutesLeft >= 60
      ? t('home.opensInHours', { h: Math.floor(minutesLeft / 60), m: minutesLeft % 60 })
      : t('home.opensInMinutes', { m: minutesLeft });

  const doneBadge = (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary dark:bg-primaryDark">
      <Ionicons name="checkmark" size={22} color={colors.white} />
    </View>
  );
  const countdownChip = (
    <View className="rounded-full bg-borderLight px-3.5 py-2 dark:bg-borderDark">
      <Text className="text-sm font-semibold text-strongGray dark:text-white">{countdown}</Text>
    </View>
  );

  const morningState: RowState = morningDone ? 'done' : 'ready';
  const eveningState: RowState = eveningDone ? 'done' : eveningUnlocked ? 'ready' : 'locked';

  return (
    <View className="overflow-hidden rounded-3xl bg-surface dark:bg-surfaceDark">
      <CheckinRow
        kind="morning"
        state={morningState}
        subtitle={
          morningDone ? t('home.done') : morningOptional ? t('home.morningOptionalToday') : t('home.readyForCheckin')
        }
        accessory={morningDone ? doneBadge : <StartButton glowing={nowAction === 'morning'} />}
      />
      <CheckinRow
        kind="evening"
        state={eveningState}
        subtitle={
          eveningDone
            ? t('home.done')
            : eveningUnlocked
              ? t('home.readyForCheckin')
              : t('home.opensAt', { time: hourToTime(EVENING_UNLOCK_HOUR) })
        }
        accessory={
          eveningDone ? doneBadge : eveningUnlocked ? <StartButton glowing={nowAction === 'evening'} /> : countdownChip
        }
        isLast
      />
    </View>
  );
}
