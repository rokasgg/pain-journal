import { Link } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryListItem, type HistoryEntry } from '@/components/history/EntryListItem';
import { PainTrendChart } from '@/components/history/PainTrendChart';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';

export default function HistoryScreen() {
  const { checkins } = useCheckinHistory(30);
  const { flareUps } = useFlareUps(30);

  const entries: HistoryEntry[] = useMemo(() => {
    const checkinEntries: HistoryEntry[] = checkins.map((data) => ({ kind: 'checkin', data }));
    const flareUpEntries: HistoryEntry[] = flareUps.map((data) => ({ kind: 'flareUp', data }));

    return [...checkinEntries, ...flareUpEntries].sort((a, b) => {
      const aDate = a.kind === 'checkin' ? a.data.checkin_date : a.data.occurred_at;
      const bDate = b.kind === 'checkin' ? b.data.checkin_date : b.data.occurred_at;
      return bDate.localeCompare(aDate);
    });
  }, [checkins, flareUps]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => `${entry.kind}-${entry.data.id}`}
        contentContainerClassName="gap-3 px-6 py-8"
        ListHeaderComponent={
          <View className="gap-6 pb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-black dark:text-white">History</Text>

              <Link href="/checkin/backfill" asChild>
                <Pressable className="rounded-full bg-black px-3 py-1.5 dark:bg-white">
                  <Text className="text-sm font-semibold text-white dark:text-black">
                    Add past entry
                  </Text>
                </Pressable>
              </Link>
            </View>

            <PainTrendChart checkins={checkins} />
          </View>
        }
        renderItem={({ item }) => <EntryListItem entry={item} />}
        ListEmptyComponent={
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            No entries yet — log a check-in to see your trend here.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
