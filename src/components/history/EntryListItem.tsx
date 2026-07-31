import { Pressable, Text, View } from 'react-native';

import { FlareUpMarker } from '@/components/history/FlareUpMarker';
import { formatCheckinDate } from '@/lib/dates';
import type { Checkin, FlareUp } from '@/types/database.types';

export type HistoryEntry =
  | { kind: 'checkin'; data: Checkin }
  | { kind: 'flareUp'; data: FlareUp };

export interface EntryListItemProps {
  entry: HistoryEntry;
  onPress?: () => void;
}

export function EntryListItem({ entry, onPress }: EntryListItemProps) {
  if (entry.kind === 'flareUp') {
    const flareUp = entry.data;
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
      >
        <View className="gap-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {formatCheckinDate(flareUp.occurred_at.slice(0, 10))}
          </Text>
          <Text className="text-base text-black dark:text-white">
            {flareUp.likely_cause ?? 'Flare-up'}
          </Text>
        </View>
        <FlareUpMarker painLevel={flareUp.pain_level} />
      </Pressable>
    );
  }

  const checkin = entry.data;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
    >
      <View className="gap-1">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {formatCheckinDate(checkin.checkin_date)}
        </Text>
        <Text className="text-base capitalize text-black dark:text-white">{checkin.type} check-in</Text>
      </View>
      <Text className="text-lg font-semibold text-black dark:text-white">{checkin.pain_level}</Text>
    </Pressable>
  );
}
