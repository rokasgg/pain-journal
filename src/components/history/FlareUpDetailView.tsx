import { format, parseISO } from 'date-fns';
import { Text, View } from 'react-native';

import { FlareUpMarker } from '@/components/history/FlareUpMarker';
import { FLARE_AREA_LABEL_KEYS, FLARE_SYMPTOM_LABEL_KEYS } from '@/constants/flareUp';
import { TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { formatCheckinDate, toLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FlareUp } from '@/types/database.types';

export interface FlareUpDetailViewProps {
  flareUp: FlareUp;
  showDate?: boolean;
}

export function FlareUpDetailView({ flareUp, showDate = true }: FlareUpDetailViewProps) {
  const { t } = useTranslation();
  // Older rows (before supabase_flare_up_details_migration.sql) have no
  // arrays and only the single likely_cause text.
  const label = (keys: Record<string, string>, value: string) => (keys[value] ? t(keys[value]) : value);
  const areas = (flareUp.pain_areas ?? []).map((v) => label(FLARE_AREA_LABEL_KEYS, v));
  const symptoms = (flareUp.symptoms ?? []).map((v) => label(FLARE_SYMPTOM_LABEL_KEYS, v));
  const triggers = flareUp.triggers?.length
    ? flareUp.triggers.map((v) => label(TRIGGER_LABEL_KEYS, v))
    : flareUp.likely_cause
      ? [flareUp.likely_cause]
      : [];
  const rows: { title: string; values: string[] }[] = [
    { title: t('flareUp.areasQuestion'), values: areas },
    { title: t('flareUp.symptomsQuestion'), values: symptoms },
    { title: t('detail.likelyCause'), values: triggers },
  ].filter((row) => row.values.length > 0);

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-black dark:text-white">
          {showDate ? formatCheckinDate(toLocalDate(flareUp.occurred_at)) : t('flareUp.flareUp')}
        </Text>
        <FlareUpMarker painLevel={flareUp.pain_level} />
      </View>

      <Text className="-mt-3 text-sm text-gray-500 dark:text-gray">
        {format(parseISO(flareUp.occurred_at), 'HH:mm')}
      </Text>

      <View>
        <View className="flex-row items-center justify-between border-b border-gray-200 py-3 dark:border-gray-800">
          <Text className="text-sm text-gray-500 dark:text-gray">{t('detail.painLevel')}</Text>
          <Text className="text-base text-black dark:text-white">{flareUp.pain_level}</Text>
        </View>
        {rows.map((row) => (
          <View
            key={row.title}
            className="flex-row items-start justify-between gap-4 border-b border-gray-200 py-3 dark:border-gray-800"
          >
            <Text className="text-sm text-gray-500 dark:text-gray">{row.title}</Text>
            <Text className="flex-1 text-right text-base text-black dark:text-white">{row.values.join(', ')}</Text>
          </View>
        ))}
      </View>

      {flareUp.description && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
            {t('flareUp.description')}
          </Text>
          <Text className="text-base text-black dark:text-white">{flareUp.description}</Text>
        </View>
      )}
    </View>
  );
}
