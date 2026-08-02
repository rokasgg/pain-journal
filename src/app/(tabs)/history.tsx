import { Link, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar, type DayMarker } from '@/components/history/MonthCalendar';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';

export default function HistoryScreen() {
  const router = useRouter();
  const { checkins } = useCheckinHistory(90);
  const { flareUps } = useFlareUps(90);

  const calendarMarkers = useMemo(() => {
    const markers: Record<string, DayMarker> = {};

    for (const checkin of checkins) {
      const marker = (markers[checkin.checkin_date] ??= {
        hasMorning: false,
        hasEvening: false,
        hasFlareUp: false,
      });
      if (checkin.type === 'morning') marker.hasMorning = true;
      else marker.hasEvening = true;
    }

    for (const flareUp of flareUps) {
      const dateStr = flareUp.occurred_at.slice(0, 10);
      const marker = (markers[dateStr] ??= { hasMorning: false, hasEvening: false, hasFlareUp: false });
      marker.hasFlareUp = true;
    }

    return markers;
  }, [checkins, flareUps]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-black dark:text-white">History</Text>

          <View className="flex-row gap-2">
            <Link href="/flare-up/new" asChild>
              <Pressable className="rounded-full border border-red-600 px-3 py-1.5 dark:border-red-500">
                <Text className="text-sm font-semibold text-red-600 dark:text-red-500">
                  Log flare-up
                </Text>
              </Pressable>
            </Link>

            <Link href="/checkin/backfill" asChild>
              <Pressable className="rounded-full bg-black px-3 py-1.5 dark:bg-white">
                <Text className="text-sm font-semibold text-white dark:text-black">Add past entry</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <PainTrendChart checkins={checkins} />

        <Link href={'/history/patterns' as Href} asChild>
          <Pressable className="items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700">
            <Text className="font-semibold text-black dark:text-white">Find patterns with AI</Text>
          </Pressable>
        </Link>

        <MonthCalendar
          markers={calendarMarkers}
          onSelectDate={(date) => router.push(`/history/day/${date}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
