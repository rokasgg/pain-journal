import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryCalendar } from '@/components/history/HistoryCalendar';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { SelectedDayPanel } from '@/components/history/SelectedDayPanel';
import { StatTile } from '@/components/history/StatTile';
import { IconSegmentedControl } from '@/components/ui/IconSegmentedControl';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useAvailableWraps } from '@/hooks/useMonthlyWrap';
import { useFlareUps } from '@/hooks/useFlareUps';
import { capitalize, currentDateFnsLocale, toLocalDate, todayLocalDate } from '@/lib/dates';
import { firstCheckinDate } from '@/lib/historyCalendar';
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
import { useHistoryViewStore } from '@/store/useHistoryViewStore';
import { haptics } from '@/utils/haptics';

const CALENDAR_LOOKBACK_DAYS = 365;

export default function HistoryScreen() {
  const { t } = useTranslation();
  const view = useHistoryViewStore((s) => s.view);
  const setView = useHistoryViewStore((s) => s.setView);
  const [range, setRange] = useState<TrendRange>('week');
  const today = todayLocalDate();
  // Today is selected by default. Changing month keeps the selection only
  // if it's in the shown month; otherwise nothing is selected (and the day
  // section hides) until a day is tapped.
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseISO(today)));
  const changeMonth = (month: Date) => {
    setVisibleMonth(month);
    if (selectedDate && selectedDate.slice(0, 7) !== format(month, 'yyyy-MM')) setSelectedDate(null);
  };

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

  const firstLoggedDate = useMemo(() => firstCheckinDate(allCheckins), [allCheckins]);

  const dayCheckins = selectedDate ? allCheckins.filter((c) => c.checkin_date === selectedDate) : [];
  const dayFlareUps = selectedDate
    ? allFlareUps.filter((f) => toLocalDate(f.occurred_at) === selectedDate)
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="px-1 text-4xl font-bold text-black dark:text-white">{t('history.title')}</Text>
          <IconSegmentedControl
            segments={[
              { key: 'charts', icon: 'stats-chart-outline', label: t('history.viewCharts') },
              { key: 'calendar', icon: 'calendar-outline', label: t('history.calendar') },
            ]}
            value={view}
            onChange={setView}
            accessibilityLabel={t('history.viewSwitcherA11y')}
          />
        </View>

        {view === 'charts' && (
          <>
            <View className="flex-row rounded-xl bg-segmentTrack p-1 dark:bg-segmentTrackDark">
              {RANGE_OPTIONS.map((option) => {
                const isActive = range === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      if (!isActive) haptics.tick();
                      setRange(option.key);
                    }}
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
                      <Pressable className="flex-row items-center gap-1.5 rounded-full bg-segmentTrack px-4 py-2 active:opacity-80 dark:bg-segmentTrackDark">
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

        {view === 'calendar' && (
          <>
            <HistoryCalendar
              visibleMonth={visibleMonth}
              onChangeMonth={changeMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              markers={calendarMarkers}
              today={today}
              firstCheckinDate={firstLoggedDate}
            />

            {selectedDate && (
              <SelectedDayPanel date={selectedDate} today={today} checkins={dayCheckins} flareUps={dayFlareUps} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
