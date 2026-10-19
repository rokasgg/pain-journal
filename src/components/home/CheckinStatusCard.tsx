import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

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

interface CheckinRowProps {
  kind: CheckinAction;
  state: RowState;
  subtitle: string;
  // The check-in to do right now — gets the soft green tint.
  isNow: boolean;
  accessory: ReactNode;
  isLast?: boolean;
}

function CheckinRow({ kind, state, subtitle, isNow, accessory, isLast }: CheckinRowProps) {
  const { t } = useTranslation();
  const meta = ROW_META[kind];

  const content = (
    <View className="relative flex-row gap-3.5 pl-4">
      {/* Always rendered, shown via style — a tint *class* toggled on/off as
          the state changes would trigger NativeWind's remount (CLAUDE.md). */}
      <View pointerEvents="none" className="absolute inset-0 bg-primary/10" style={{ opacity: isNow ? 1 : 0 }} />
      <View className={`mt-4 h-11 w-11 items-center justify-center rounded-xl ${meta.tile}`}>
        <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
      </View>
      <View
        className={`flex-1 flex-row items-center gap-3 py-4 pr-4 ${isLast ? '' : 'border-b border-borderLight dark:border-borderDark'
          }`}
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-md font-semibold text-black dark:text-white">{t(meta.titleKey)}</Text>
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
// ready → "Start". The one that's due right now (getNowAction) gets a soft
// green tint instead of the old glow ring. A brand-new user in the evening
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
  const startButton = (
    <View className="rounded-full bg-primary px-4 py-2 dark:bg-primaryDark">
      <Text className="text-sm font-semibold text-white">{t('home.start')}</Text>
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
        isNow={nowAction === 'morning'}
        subtitle={
          morningDone ? t('home.done') : morningOptional ? t('home.morningOptionalToday') : t('home.readyForCheckin')
        }
        accessory={morningDone ? doneBadge : startButton}
      />
      <CheckinRow
        kind="evening"
        state={eveningState}
        isNow={nowAction === 'evening' && eveningUnlocked}
        subtitle={
          eveningDone
            ? t('home.done')
            : eveningUnlocked
              ? t('home.readyForCheckin')
              : t('home.opensAt', { time: hourToTime(EVENING_UNLOCK_HOUR) })
        }
        accessory={eveningDone ? doneBadge : eveningUnlocked ? startButton : countdownChip}
        isLast
      />
    </View>
  );
}
