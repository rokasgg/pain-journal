import { Link, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryListItem, type HistoryEntry } from '@/components/history/EntryListItem';
import { MonthCalendar, type DayMarker } from '@/components/history/MonthCalendar';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { StatTile } from '@/components/history/StatTile';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [rangeDays, setRangeDays] = useState<number>(7);

  const RANGE_OPTIONS = [
    { label: t('history.week'), days: 7 },
    { label: t('history.month'), days: 30 },
    { label: t('history.all'), days: 365 },
  ] as const;

  const activeRange = RANGE_OPTIONS.find((option) => option.days === rangeDays) ?? RANGE_OPTIONS[0];

  const { checkins } = useCheckinHistory(rangeDays);
  const { flareUps } = useFlareUps(rangeDays);
  const { checkins: allCheckins } = useCheckinHistory(90);
  const { flareUps: allFlareUps } = useFlareUps(90);

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

  const calendarMarkers = useMemo(() => {
    const markers: Record<string, DayMarker> = {};

    for (const checkin of allCheckins) {
      const marker = (markers[checkin.checkin_date] ??= {
        hasMorning: false,
        hasEvening: false,
        hasFlareUp: false,
      });
      if (checkin.type === 'morning') marker.hasMorning = true;
      else marker.hasEvening = true;
    }

    for (const flareUp of allFlareUps) {
      const dateStr = flareUp.occurred_at.slice(0, 10);
      const marker = (markers[dateStr] ??= { hasMorning: false, hasEvening: false, hasFlareUp: false });
      marker.hasFlareUp = true;
    }

    return markers;
  }, [allCheckins, allFlareUps]);

  const entries: HistoryEntry[] = useMemo(() => {
    const checkinEntries: HistoryEntry[] = checkins.map((data) => ({ kind: 'checkin', data }));
    const flareUpEntries: HistoryEntry[] = flareUps.map((data) => ({ kind: 'flareUp', data }));

    return [...checkinEntries, ...flareUpEntries]
      .sort((a, b) => {
        const aDate = a.kind === 'checkin' ? a.data.checkin_date : a.data.occurred_at;
        const bDate = b.kind === 'checkin' ? b.data.checkin_date : b.data.occurred_at;
        return bDate.localeCompare(aDate);
      })
      .slice(0, 10);
  }, [checkins, flareUps]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <View className="flex-column items-start justify-between">
          <Text className="text-2xl font-bold text-black dark:text-white mb-2">{t('history.title')}</Text>

          <View className="flex-row w-full justify-between">
            <Link href="/flare-up/new" asChild>
              <Pressable className="rounded-full border border-red-600 px-3 py-1.5 dark:border-red-500">
                <Text className="text-sm font-semibold text-red-600 dark:text-red-500">
                  {t('history.logFlareUpChip')}
                </Text>
              </Pressable>
            </Link>

            <Link href="/checkin/backfill" asChild>
              <Pressable className="rounded-full bg-primary px-3 py-1.5 dark:bg-primaryDark">
                <Text className="text-sm font-semibold text-white">{t('history.addPastEntry')}</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="flex-row rounded-full bg-primaryMuted p-1 dark:bg-primaryMutedDark">
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
                  className={`text-sm font-medium ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
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

        <Link href={'/history/patterns' as Href} asChild>
          <Pressable className="items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700">
            <Text className="font-semibold text-black dark:text-white">{t('history.findPatterns')}</Text>
          </Pressable>
        </Link>

        <MonthCalendar
          markers={calendarMarkers}
          onSelectDate={(date) => router.push(`/history/day/${date}`)}
        />

        {entries.length > 0 && (
          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              {t('history.recentEntries')}
            </Text>
            {entries.map((entry) => (
              <EntryListItem
                key={`${entry.kind}-${entry.data.id}`}
                entry={entry}
                onPress={() => router.push(`/history/${entry.kind}/${entry.data.id}` as Href)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
