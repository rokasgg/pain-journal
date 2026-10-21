import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import { formatHeadingDate } from '@/lib/dates';
import { dayAveragePain } from '@/lib/historyCalendar';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { getSlotStatus, lateLogDeadline, type SlotStatus } from '@/lib/lateLogging';
import { colors } from '@/lib/theme';
import { hourToTime } from '@/lib/time';
import type { Checkin, CheckinType, FlareUp } from '@/types/database.types';

// Same amber sun / indigo moon tiles as Home's CheckinStatusCard.
const SLOT_META: Record<
  CheckinType,
  { icon: keyof typeof Ionicons.glyphMap; tile: string; iconColor: string; titleKey: string }
> = {
  morning: {
    icon: 'sunny-outline',
    tile: 'bg-amber-100 dark:bg-amber-950',
    iconColor: '#d97706',
    titleKey: 'home.morningCheckin',
  },
  evening: {
    icon: 'moon-outline',
    tile: 'bg-indigo-100 dark:bg-indigo-950',
    iconColor: '#4f46e5',
    titleKey: 'home.eveningCheckin',
  },
};
const FLARE_RED = '#B42318';

function formatScore(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 1 });
}

interface SlotCardProps {
  type: CheckinType;
  date: string;
  checkin: Checkin | undefined;
  status: SlotStatus;
  today: string;
}

function SlotCard({ type, date, checkin, status, today }: SlotCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const meta = SLOT_META[type];

  const subtitle =
    status === 'logged' && checkin
      ? t('history.slotLoggedSubtitle', { pain: checkin.pain_level })
      : status === 'opensLater'
        ? t('home.opensAt', { time: hourToTime(EVENING_UNLOCK_HOUR) })
        : t('history.notLogged');

  const header = (
    <View className="flex-row items-center gap-3.5">
      <View className={`h-11 w-11 items-center justify-center rounded-xl ${meta.tile}`}>
        <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-base font-semibold text-ink dark:text-white">{t(meta.titleKey)}</Text>
          {checkin?.logged_late && (
            <View className="rounded-md bg-segmentTrack px-1.5 py-0.5 dark:bg-segmentTrackDark">
              <Text className="text-xs text-inkSecondary dark:text-gray">{t('history.loggedLateTag')}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-inkSecondary dark:text-gray">{subtitle}</Text>
      </View>
      {status === 'logged' && <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />}
    </View>
  );

  if (status === 'logged' && checkin) {
    return (
      <Link href={{ pathname: '/history/[kind]/[id]', params: { kind: 'checkin', id: checkin.id } }} asChild>
        <Pressable
          accessibilityRole="button"
          className="rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surfaceDark"
        >
          {header}
        </Pressable>
      </Link>
    );
  }

  const deadline = status === 'canLogLate' ? lateLogDeadline(date, today) : null;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      {header}
      {(status === 'canLogLate' || status === 'canLogNow') && (
        <Pressable
          onPress={() =>
            router.push(
              (status === 'canLogLate' ? `/checkin/${type}?date=${date}` : `/checkin/${type}`) as Href,
            )
          }
          accessibilityRole="button"
          className="h-11 items-center justify-center rounded-xl bg-accentMuted active:opacity-70 dark:bg-segmentTrackDark"
        >
          <Text className="text-base font-semibold text-[#1F3E2C] dark:text-white">
            {t(status === 'canLogLate' ? 'history.logLater' : 'history.logNow')}
          </Text>
        </Pressable>
      )}
      {deadline && (
        <Text className="text-xs text-inkSecondary dark:text-gray">
          {t('history.lateHint', {
            deadline: t(deadline === 'today' ? 'history.deadlineToday' : 'history.deadlineTomorrow'),
          })}
        </Text>
      )}
    </View>
  );
}

export interface SelectedDayPanelProps {
  date: string; // local yyyy-MM-dd
  today: string;
  checkins: Checkin[]; // that day's
  flareUps: FlareUp[]; // that day's
}

// History → Calendar: what happened on the selected day. Morning and evening
// cards (open the full check-in, or "Log it later" within the late window —
// src/lib/lateLogging.ts), the day's flare-ups and notes.
export function SelectedDayPanel({ date, today, checkins, flareUps }: SelectedDayPanelProps) {
  const { t, locale } = useTranslation();
  const hour = new Date().getHours();
  const avg = dayAveragePain(checkins);
  const notes = (['morning', 'evening'] as const)
    .map((type) => ({ type, text: checkins.find((c) => c.type === type)?.notes?.trim() }))
    .filter((note): note is { type: CheckinType; text: string } => !!note.text);

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="flex-shrink text-xl font-bold text-ink dark:text-white">
          {formatHeadingDate(parseISO(date), locale)}
        </Text>
        {avg !== null && (
          <Text className="text-sm font-semibold text-inkSecondary dark:text-gray">
            {t('history.dayAvg', { value: formatScore(avg, locale) })}
          </Text>
        )}
      </View>

      {(['morning', 'evening'] as const).map((type) => {
        const checkin = checkins.find((c) => c.type === type);
        return (
          <SlotCard
            key={type}
            type={type}
            date={date}
            checkin={checkin}
            today={today}
            status={getSlotStatus({ date, type, today, hour, logged: !!checkin })}
          />
        );
      })}

      <View className="rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <Text className="mb-2 text-sm font-semibold text-inkSecondary dark:text-gray">{t('history.flares')}</Text>
        {flareUps.length === 0 ? (
          <Text className="text-sm text-inkSecondary dark:text-gray">{t('history.noFlareUps')}</Text>
        ) : (
          flareUps.map((flareUp) => (
            <Link
              key={flareUp.id}
              href={{ pathname: '/history/[kind]/[id]', params: { kind: 'flareUp', id: flareUp.id } }}
              asChild
            >
              <Pressable accessibilityRole="button" className="min-h-11 flex-row items-center gap-3 active:opacity-70">
                <Ionicons name="flash" size={16} color={FLARE_RED} />
                <Text className="flex-1 text-base text-ink dark:text-white">
                  {t('history.flareUpRow', {
                    time: format(parseISO(flareUp.occurred_at), 'HH:mm'),
                    pain: flareUp.pain_level,
                  })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
              </Pressable>
            </Link>
          ))
        )}
      </View>

      {notes.length > 0 && (
        <View className="gap-2 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
          <Text className="text-sm font-semibold text-inkSecondary dark:text-gray">{t('detail.notes')}</Text>
          {notes.map((note) => (
            <View key={note.type} className="gap-0.5">
              {notes.length > 1 && (
                <Text className="text-xs text-inkSecondary dark:text-gray">
                  {t(note.type === 'morning' ? 'home.morning' : 'home.evening')}
                </Text>
              )}
              <Text className="text-base text-ink dark:text-white">{note.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
