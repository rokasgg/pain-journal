import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayEntries } from '@/components/history/DayEntries';
import { MonthCalendar } from '@/components/history/MonthCalendar';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { StatTile } from '@/components/history/StatTile';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { formatCheckinDate } from '@/lib/dates';
import { buildCalendarMarkers } from '@/lib/historyEntries';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const CALENDAR_LOOKBACK_DAYS = 365;

type Section = 'overview' | 'calendar';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('overview');
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const SECTION_OPTIONS: { key: Section; label: string }[] = [
    { key: 'overview', label: t('history.overview') },
    { key: 'calendar', label: t('history.calendar') },
  ];

  const RANGE_OPTIONS = [
    { label: t('history.week'), days: 7 },
    { label: t('history.month'), days: 30 },
    { label: t('history.all'), days: 365 },
  ] as const;

  const activeRange = RANGE_OPTIONS.find((option) => option.days === rangeDays) ?? RANGE_OPTIONS[0];

  const { checkins } = useCheckinHistory(rangeDays);
  const { flareUps } = useFlareUps(rangeDays);
  const { checkins: allCheckins } = useCheckinHistory(CALENDAR_LOOKBACK_DAYS);
  const { flareUps: allFlareUps } = useFlareUps(CALENDAR_LOOKBACK_DAYS);

  const avgPain = useMemo(() => {
    if (checkins.length === 0) return null;
    // Average per day first, then average those — otherwise a day with both
    // a morning and evening entry counts twice and skews the result.
    const byDate = new Map<string, number[]>();
    for (const checkin of checkins) {
      const levels = byDate.get(checkin.checkin_date) ?? [];
      levels.push(checkin.pain_level);
      byDate.set(checkin.checkin_date, levels);
    }
    const dailyAverages = [...byDate.values()].map(
      (levels) => levels.reduce((sum, level) => sum + level, 0) / levels.length,
    );
    return dailyAverages.reduce((sum, avg) => sum + avg, 0) / dailyAverages.length;
  }, [checkins]);

  const avgPainTrend = useMemo(() => {
    if (checkins.length < 4) return undefined;
    const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalfAvg = sorted.slice(0, mid).reduce((s, c) => s + c.pain_level, 0) / mid;
    const secondHalfAvg =
      sorted.slice(mid).reduce((s, c) => s + c.pain_level, 0) / (sorted.length - mid);
    if (firstHalfAvg === 0) return undefined;
    const percent = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
    return {
      direction: percent >= 0 ? ('up' as const) : ('down' as const),
      label: `${Math.abs(percent)}%`,
      isGood: percent <= 0,
    };
  }, [checkins]);

  const calendarMarkers = useMemo(
    () => buildCalendarMarkers(allCheckins, allFlareUps),
    [allCheckins, allFlareUps],
  );

  const dayCheckins = selectedDate ? allCheckins.filter((c) => c.checkin_date === selectedDate) : [];
  const dayFlareUps = selectedDate
    ? allFlareUps.filter((f) => f.occurred_at.slice(0, 10) === selectedDate)
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
              className="absolute right-6 w-52 gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-surfaceDark"
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

        <View className="flex-row rounded-full bg-primaryMuted p-1 dark:bg-primaryMutedDark">
          {SECTION_OPTIONS.map((option) => {
            const isActive = section === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSection(option.key)}
                className={`flex-1 items-center rounded-full py-2 ${isActive ? 'bg-surface dark:bg-surfaceDark' : ''
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
            <View className="flex-row rounded-full bg-primaryMuted p-1 dark:bg-primaryMutedDark ">
              {RANGE_OPTIONS.map((option) => {
                const isActive = rangeDays === option.days;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setRangeDays(option.days)}
                    className={`flex-1 items-center rounded-full py-2 ${isActive ? 'bg-surface dark:bg-surfaceDark' : ''
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
                label={t('history.avgDailyPain', { range: activeRange.label })}
                value={avgPain !== null ? avgPain.toFixed(1) : '—'}
                trend={avgPainTrend}
              />
              <StatTile label={t('history.flares', { range: activeRange.label })} value={String(flareUps.length)} />
            </View>

            <PainTrendChart checkins={checkins} />
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
