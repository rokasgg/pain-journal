import { Text, View } from 'react-native';

import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Checkin } from '@/types/database.types';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-3 dark:border-gray-800">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}

export interface CheckinDetailViewProps {
  checkin: Checkin;
  showDate?: boolean;
}

export function CheckinDetailView({ checkin, showDate = true }: CheckinDetailViewProps) {
  const { t } = useTranslation();

  const symptomLabels = [
    checkin.symptoms.tingling && t('symptoms.tingling'),
    checkin.symptoms.numbness && t('symptoms.numbness'),
    checkin.symptoms.headache && t('symptoms.headache'),
    ...(checkin.symptoms.custom ?? []),
  ].filter(Boolean) as string[];

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-black dark:text-white">
          {t(checkin.type === 'morning' ? 'detail.morningCheckin' : 'detail.eveningCheckin')}
        </Text>
        {showDate && (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {formatCheckinDate(checkin.checkin_date)}
          </Text>
        )}
      </View>

      <View>
        <DetailRow label={t('detail.painLevel')} value={checkin.pain_level} />
        <DetailRow label={t('detail.stiffness')} value={checkin.stiffness_level} />
        <DetailRow label={t('detail.rangeOfMotion')} value={checkin.range_of_motion} />

        {checkin.type === 'morning' && (
          <>
            <DetailRow label={t('detail.sleepQuality')} value={checkin.sleep_quality} />
            <DetailRow label={t('detail.sleepHours')} value={checkin.sleep_hours} />
            <DetailRow
              label={t('detail.wokeUpWithPain')}
              value={checkin.woke_up_with_pain ? t('common.yes') : t('common.no')}
            />
            <DetailRow
              label={t('detail.sleepPosition')}
              value={checkin.sleep_position ? t(`sleepPosition.${checkin.sleep_position}`) : null}
            />
          </>
        )}

        {checkin.type === 'evening' && (
          <>
            <DetailRow label={t('detail.activityLevel')} value={checkin.activity_level} />
            <DetailRow label={t('detail.screenTimeHours')} value={checkin.screen_time_hours} />
            <DetailRow
              label={t('detail.didExercises')}
              value={checkin.did_exercises ? t('common.yes') : t('common.no')}
            />
            <DetailRow label={t('detail.exerciseHours')} value={checkin.exercise_hours} />
            <DetailRow label={t('detail.exerciseIntensity')} value={checkin.exercise_intensity} />
          </>
        )}
      </View>

      {symptomLabels.length > 0 && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t('detail.symptoms')}
          </Text>
          <Text className="text-base text-black dark:text-white">{symptomLabels.join(', ')}</Text>
          {checkin.symptoms.radiating_to && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('detail.radiatingTo', { location: checkin.symptoms.radiating_to })}
            </Text>
          )}
        </View>
      )}

      {(checkin.symptoms.pain_areas?.length ?? 0) > 0 && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t('detail.painAreas')}
          </Text>
          <Text className="text-base text-black dark:text-white">
            {checkin.symptoms.pain_areas?.join(', ')}
          </Text>
        </View>
      )}

      {checkin.triggers.length > 0 && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t('detail.triggers')}
          </Text>
          <Text className="text-base text-black dark:text-white">{checkin.triggers.join(', ')}</Text>
        </View>
      )}

      {checkin.exercise_notes && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            {t('detail.exerciseNotes')}
          </Text>
          <Text className="text-base text-black dark:text-white">{checkin.exercise_notes}</Text>
        </View>
      )}

      {checkin.notes && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('detail.notes')}</Text>
          <Text className="text-base text-black dark:text-white">{checkin.notes}</Text>
        </View>
      )}
    </View>
  );
}
