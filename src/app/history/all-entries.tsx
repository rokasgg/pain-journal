import { EntryListItem } from '@/components/history/EntryListItem';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MonthCalendar } from '@/components/history/MonthCalendar';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { buildCalendarMarkers, buildHistoryEntries } from '@/lib/historyEntries';
import { useTranslation } from '@/lib/i18n/useTranslation';

const ENTRIES_PAGE_SIZE = 10;

export default function AllEntriesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [visibleEntryCount, setVisibleEntryCount] = useState(ENTRIES_PAGE_SIZE);

  const { checkins } = useCheckinHistory(365);
  const { flareUps } = useFlareUps(365);

  const calendarMarkers = useMemo(() => buildCalendarMarkers(checkins, flareUps), [checkins, flareUps]);
  const entries = useMemo(() => buildHistoryEntries(checkins, flareUps), [checkins, flareUps]);

  const visibleEntries = entries.slice(0, visibleEntryCount);
  const hasMoreEntries = visibleEntryCount < entries.length;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-6"
    >
      <MonthCalendar
        markers={calendarMarkers}
        onSelectDate={(date) => router.push(`/history/day/${date}`)}
      />

      <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
        {t('history.allEntries')}
      </Text>

      {visibleEntries.length > 0 && (
        <View className="gap-3">
          {visibleEntries.map((entry) => (
            <EntryListItem
              key={`${entry.kind}-${entry.data.id}`}
              entry={entry}
              onPress={() => router.push(`/history/${entry.kind}/${entry.data.id}` as Href)}
            />
          ))}
        </View>
      )}

      {hasMoreEntries && (
        <Pressable
          className="items-center rounded-xl justify-center h-16 py-3 dark:bg-primaryDark"
          onPress={() => setVisibleEntryCount((count) => count + ENTRIES_PAGE_SIZE)}
        >
          <Text className="font-semibold text-primary text-lg dark:text-white">{t('history.loadMore')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
