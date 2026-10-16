import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Link, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayEntries } from '@/components/history/DayEntries';
import { MonthCalendar } from '@/components/history/MonthCalendar';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { StatTile } from '@/components/history/StatTile';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useAvailableWraps } from '@/hooks/useMonthlyWrap';
import { useFlareUps } from '@/hooks/useFlareUps';
import { capitalize, currentDateFnsLocale, formatCheckinDate, toLocalDate, todayLocalDate } from '@/lib/dates';
import { buildCalendarMarkers } from '@/lib/historyEntries';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  comparePeriods,
  countPainFreeDays,
  dailyAverages,
  rangeStartDate,
  type TrendRange,
} from '@/lib/painTrend';
import { colors } from '@/lib/theme';

const CALENDAR_LOOKBACK_DAYS = 365;

type Section = 'overview' | 'calendar';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('overview');
  const [range, setRange] = useState<TrendRange>('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const SECTION_OPTIONS: { key: Section; label: string }[] = [
    { key: 'overview', label: t('history.overview') },
    { key: 'calendar', label: t('history.calendar') },
  ];

  const RANGE_OPTIONS: { key: TrendRange; label: string }[] = [
    { key: 'week', label: t('history.week') },
    { key: 'month', label: t('history.month') },
    { key: 'all', label: t('history.all') },
  ];

  // One 365-day fetch (shared with the calendar) filtered client-side per
  // range — a per-range query briefly returned [] on every switch, which
  // blanked the stat tiles and unmounted the chart (the flicker).
  const { checkins: allCheckins } = useCheckinHistory(CALENDAR_LOOKBACK_DAYS);
  const { flareUps: allFlareUps } = useFlareUps(CALENDAR_LOOKBACK_DAYS);

  const rangeStart = useMemo(() => rangeStartDate(range, todayLocalDate(), allCheckins), [range, allCheckins]);
  const checkins = useMemo(
    () => allCheckins.filter((checkin) => checkin.checkin_date >= rangeStart),
    [allCheckins, rangeStart],
  );
  const flareUps = useMemo(
    () => allFlareUps.filter((flareUp) => toLocalDate(flareUp.occurred_at) >= rangeStart),
    [allFlareUps, rangeStart],
  );

  const avgPain = useMemo(() => {
    // Average per day first, then average those — otherwise a day with both
    // a morning and evening entry counts twice and skews the result.
    const perDay = [...dailyAverages(checkins).values()];
    if (perDay.length === 0) return null;
    return perDay.reduce((sum, avg) => sum + avg, 0) / perDay.length;
  }, [checkins]);

  // Compared against the same-length window just before this one, in points
  // (not percent — on a 0–10 scale 1 → 2 would read as "+100%"). Uses
  // allCheckins since the previous window sits outside the current range.
  const avgPainTrend = useMemo(() => {
    const comparison = comparePeriods(allCheckins, range, todayLocalDate());
    if (!comparison) return undefined;
    const delta = Math.abs(comparison.delta).toFixed(1);
    return {
      direction: comparison.delta > 0 ? ('up' as const) : ('down' as const),
      label: t(range === 'week' ? 'history.trendVsPrevWeek' : 'history.trendVsPrevMonth', { delta }),
      isGood: comparison.delta < 0,
    };
  }, [allCheckins, range, t]);

  const painFree = useMemo(() => countPainFreeDays(checkins), [checkins]);
  const availableWraps = useAvailableWraps();

  const calendarMarkers = useMemo(
    () => buildCalendarMarkers(allCheckins, allFlareUps),
    [allCheckins, allFlareUps],
  );

  const dayCheckins = selectedDate ? allCheckins.filter((c) => c.checkin_date === selectedDate) : [];
  const dayFlareUps = selectedDate
    ? allFlareUps.filter((f) => toLocalDate(f.occurred_at) === selectedDate)
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-black dark:text-white">{t('history.title')}</Text>

          <Pressable
            onPress={() => setIsAddMenuOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={t('history.addPastEntry')}
            className="h-9 w-9 items-center justify-center rounded-full dark:bg-primaryDark"
          >
            <Ionicons name={isAddMenuOpen ? 'close' : 'add'} size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Modal visible={isAddMenuOpen} transparent animationType="fade" onRequestClose={() => setIsAddMenuOpen(false)}>
          <Pressable className="flex-1" onPress={() => setIsAddMenuOpen(false)}>
            <View
              className="absolute right-6 w-52 gap-0.5 rounded-xl border border-gray bg-white p-1 shadow-lg dark:border-gray dark:bg-surfaceDark"
              style={{ top: insets.top + 76 }}
            >
              <Pressable
                onPress={() => {
                  setIsAddMenuOpen(false);
                  router.push('/checkin/backfill');
                }}
                className="rounded-lg px-3 py-2.5"
              >
                <Text className="text-sm font-medium text-black dark:text-white">
                  {t('history.addPastEntry')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsAddMenuOpen(false);
                  router.push('/flare-up/new');
                }}
                className="rounded-lg px-3 py-2.5"
              >
                <Text className="text-sm font-medium text-red-600 dark:text-red-500">
                  {t('history.logFlareUpChip')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <View className="flex-row rounded-xl bg-primaryMuted p-1 dark:bg-primaryMutedDark">
          {SECTION_OPTIONS.map((option) => {
            const isActive = section === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSection(option.key)}
                className={`flex-1 items-center rounded-xl py-2 active:bg-surface/20 dark:active:bg-surfaceDark ${isActive ? 'bg-surface dark:bg-primary/80' : ''
                  }`}
              >
                <Text
                  className={`text-sm font-semibold ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray'
                    }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {section === 'overview' && (
          <>
            <View className="flex-row rounded-xl bg-primaryMuted p-1 dark:bg-primaryMutedDark ">
              {RANGE_OPTIONS.map((option) => {
                const isActive = range === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setRange(option.key)}
                    className={`flex-1 items-center rounded-xl py-2 ${isActive ? 'bg-surface dark:bg-surfaceDark' : ''
                      }`}
                  >
                    <Text
                      className={`text-sm font-medium ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray'
                        }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-3">
              <StatTile
                label={t('history.avgDailyPain')}
                value={avgPain !== null ? avgPain.toFixed(1) : '—'}
                trend={avgPainTrend}
              />
              <StatTile label={t('history.flares')} value={String(flareUps.length)} />
              <StatTile
                label={t('history.painFreeDays')}
                value={painFree.logged > 0 ? `${painFree.painFree}/${painFree.logged}` : '—'}
              />
            </View>

            <PainTrendChart checkins={allCheckins} range={range} />

            {availableWraps.length > 0 && (
              <View className="gap-3">
                <Text className="text-base font-semibold text-black dark:text-white">{t('wrap.archiveTitle')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {availableWraps.map((month) => (
                    <Link key={month} href={`/wrap/${month}` as Href} asChild>
                      <Pressable className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-4 py-2 active:opacity-80 dark:bg-primaryMutedDark">
                        <Ionicons name="sparkles" size={14} color={colors.primary} />
                        <Text className="text-sm font-medium text-black dark:text-white">
                          {capitalize(format(parseISO(`${month}-01`), 'LLL yyyy', { locale: currentDateFnsLocale() }))}
                        </Text>
                      </Pressable>
                    </Link>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {section === 'calendar' && (
          <>
            <MonthCalendar
              markers={calendarMarkers}
              onSelectDate={(date) =>
                setSelectedDate((prev) => (prev === date ? null : date))
              }
            />

            {selectedDate && (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-black dark:text-white">
                    {formatCheckinDate(selectedDate)}
                  </Text>
                  <Pressable onPress={() => setSelectedDate(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.gray} />
                  </Pressable>
                </View>

                <DayEntries checkins={dayCheckins} flareUps={dayFlareUps} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
