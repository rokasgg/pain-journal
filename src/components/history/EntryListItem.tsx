import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Checkin, FlareUp } from '@/types/database.types';

export type HistoryEntry = { kind: 'checkin'; data: Checkin } | { kind: 'flareUp'; data: FlareUp };

function severityColor(painLevel: number) {
  if (painLevel >= 7) return { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400' };
  if (painLevel >= 4) return { bg: 'bg-primaryMuted dark:bg-primaryMutedDark', text: 'text-black dark:text-white' };
  return { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' };
}

export interface EntryListItemProps {
  entry: HistoryEntry;
  onPress?: () => void;
}

export function EntryListItem({ entry, onPress }: EntryListItemProps) {
  const { t } = useTranslation();
  const isFlareUp = entry.kind === 'flareUp';
  const painLevel = entry.data.pain_level;
  const severity = severityColor(painLevel);

  const dateStr = isFlareUp
    ? formatCheckinDate((entry.data as FlareUp).occurred_at.slice(0, 10))
    : formatCheckinDate((entry.data as Checkin).checkin_date);

  const description = isFlareUp
    ? ((entry.data as FlareUp).likely_cause ?? t('flareUp.flareUp'))
    : t((entry.data as Checkin).type === 'morning' ? 'detail.morningCheckin' : 'detail.eveningCheckin');

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark"
    >
      <View className={`h-11 w-11 items-center justify-center rounded-full ${severity.bg}`}>
        <Text className={`text-base font-bold ${severity.text}`}>{painLevel}</Text>
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-medium text-black dark:text-white">{dateStr}</Text>
          {isFlareUp && (
            <View className="rounded-full bg-red-600 px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-white">{t('flareUp.flareUp')}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
          {description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </Pressable>
  );
}
