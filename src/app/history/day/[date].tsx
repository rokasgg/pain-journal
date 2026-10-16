import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { DayEntries } from '@/components/history/DayEntries';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { formatCheckinDate, toLocalDate } from '@/lib/dates';

export default function HistoryDayModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { checkins } = useCheckinHistory(90);
  const { flareUps } = useFlareUps(90);

  const dayCheckins = checkins.filter((c) => c.checkin_date === date);
  const dayFlareUps = flareUps.filter((f) => toLocalDate(f.occurred_at) === date);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-xl font-bold text-black dark:text-white">
        {date ? formatCheckinDate(date) : ''}
      </Text>

      <DayEntries checkins={dayCheckins} flareUps={dayFlareUps} />
    </ScrollView>
  );
}
