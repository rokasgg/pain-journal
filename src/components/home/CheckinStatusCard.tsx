import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { GlowPulse } from '@/components/ui/GlowPulse';
import { useJourney } from '@/hooks/useJourney';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { getNowAction, isMorningOptionalToday } from '@/lib/checkinTiming';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

interface StatusCardProps {
  label: string;
  icon: 'sunny' | 'moon';
  done: boolean;
  href: '/checkin/morning' | '/checkin/evening';
  locked?: boolean;
  // First-day evening: the morning moment has passed, so it's shown muted as
  // optional (still tappable — never blocked).
  optional?: boolean;
}

function StatusCard({ label, icon, done, href, locked, optional }: StatusCardProps) {
  const { t } = useTranslation();

  return (
    <View
      className={`flex-row items-center justify-between rounded-2xl p-4 ${done
        ? 'border-gray-200 bg-surface dark:border-gray-800 dark:bg-surfaceDark'
        : locked || optional
          ? 'border-gray-200 bg-surface opacity-60 dark:border-gray-800 dark:bg-surfaceDark'
          : 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
        }`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/60 dark:bg-black/20">
          <Ionicons name={icon} size={24} color={icon === 'sunny' ? '#d97706' : colors.gray} />
        </View>
        <View>
          <Text className="text-base font-semibold text-black dark:text-white">{label}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray">
            {done
              ? t('home.completed')
              : locked
                ? t('home.unlocksAt')
                : optional
                  ? t('home.morningOptionalToday')
                  : t('home.readyForCheckin')}
          </Text>
        </View>
      </View>

      {done ? (
        <Ionicons name="checkmark-circle" size={25} color={colors.primary} />
      ) : locked ? (
        <Ionicons name="lock-closed" size={25} color={colors.gray} />
      ) : (
        <Link href={href} asChild>
          <Pressable className="rounded-full bg-primary px-4 py-2 dark:bg-primaryDark active:opacity-60">
            <Text className="text-sm font-semibold text-white">{t('home.start')}</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

export function CheckinStatusCard() {
  const { t } = useTranslation();
  const { morningDone, eveningDone, eveningUnlocked } = useTodayStatus();
  const { state } = useJourney();
  const hour = new Date().getHours();
  // Exactly one card glows: the check-in that's the thing to do right now.
  const nowAction = getNowAction({ hour, morningDone, eveningDone });
  const morningOptional = !morningDone && isMorningOptionalToday({ hour, loggedDays: state.loggedDays });

  return (
    <View className="gap-3">
      <GlowPulse active={nowAction === 'morning'}>
        <StatusCard
          label={t('home.morning')}
          icon="sunny"
          done={morningDone}
          href="/checkin/morning"
          optional={morningOptional}
        />
      </GlowPulse>
      <GlowPulse active={nowAction === 'evening' && eveningUnlocked}>
        <StatusCard
          label={t('home.evening')}
          icon="moon"
          done={eveningDone}
          href="/checkin/evening"
          locked={!eveningUnlocked}
        />
      </GlowPulse>
    </View>
  );
}
