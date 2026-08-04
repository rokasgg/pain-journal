import { Text, View } from 'react-native';

import { FlareUpMarker } from '@/components/history/FlareUpMarker';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FlareUp } from '@/types/database.types';

export interface FlareUpDetailViewProps {
  flareUp: FlareUp;
  showDate?: boolean;
}

export function FlareUpDetailView({ flareUp, showDate = true }: FlareUpDetailViewProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-black dark:text-white">
          {showDate ? formatCheckinDate(flareUp.occurred_at.slice(0, 10)) : t('flareUp.flareUp')}
        </Text>
        <FlareUpMarker painLevel={flareUp.pain_level} />
      </View>

      <View>
        <View className="flex-row items-center justify-between border-b border-gray-200 py-3 dark:border-gray-800">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t('detail.painLevel')}</Text>
          <Text className="text-base text-black dark:text-white">{flareUp.pain_level}</Text>
        </View>
        {flareUp.likely_cause && (
          <View className="flex-row items-center justify-between border-b border-gray-200 py-3 dark:border-gray-800">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('detail.likelyCause')}</Text>
            <Text className="text-base text-black dark:text-white">{flareUp.likely_cause}</Text>
          </View>
        )}
      </View>

      {flareUp.description && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t('flareUp.description')}
          </Text>
          <Text className="text-base text-black dark:text-white">{flareUp.description}</Text>
        </View>
      )}
    </View>
  );
}
