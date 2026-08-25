import { Text, View } from 'react-native';

import { PAIN_AREA_LABEL_KEYS, TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Checkin } from '@/types/database.types';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-gray dark:text-gray">{label}</Text>
      <Text className="text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}

function ScaleRow({ label, value }: { label: string; value: number | null | undefined }) {
  if (value === null || value === undefined) return null;

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-gray dark:text-gray">{label}</Text>
      <Text className="text-base text-black dark:text-white">
        {value}
        <Text className="text-base text-gray dark:text-gray">/10</Text>
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-1 rounded-2xl bg-surface px-4 py-2 dark:bg-surfaceDark">
      <Text className="pt-2 text-xs font-semibold uppercase text-primary dark:text-gray">{title}</Text>
      {children}
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

  const painAreaLabels = (checkin.symptoms.pain_areas ?? []).map(
    (area) => t(PAIN_AREA_LABEL_KEYS[area] ?? area),
  );

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-strongGray dark:text-white">
          {t(checkin.type === 'morning' ? 'detail.morningCheckin' : 'detail.eveningCheckin')}
        </Text>
        {showDate && (
          <Text className="text-sm text-strongGray dark:text-white">
            {formatCheckinDate(checkin.checkin_date)}
          </Text>
        )}
      </View>

      <Section title={t('detail.painAndMovementSection')}>
        <ScaleRow label={t('detail.painLevel')} value={checkin.pain_level} />
        <ScaleRow label={t('detail.stiffness')} value={checkin.stiffness_level} />
        <ScaleRow label={t('detail.rangeOfMotion')} value={checkin.range_of_motion} />
      </Section>

      {checkin.type === 'morning' && (
        <View>
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
        </View>
      )}

      {checkin.type === 'evening' && (
        <>
          <Section title={t('detail.lifestyleSection')}>
            <ScaleRow label={t('detail.activityLevel')} value={checkin.activity_level} />
            <DetailRow label={t('detail.screenTimeHours')} value={checkin.screen_time_hours} />
          </Section>

          <Section title={t('detail.exercisesSection')}>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-sm text-gray dark:text-gray">{t('detail.didExercises')}</Text>
              <Text
                className={
                  checkin.did_exercises
                    ? 'text-base font-semibold text-green-600 dark:text-green-400'
                    : 'text-base text-black dark:text-white'
                }
              >
                {checkin.did_exercises ? t('common.yes') : t('common.no')}
              </Text>
            </View>
            <DetailRow label={t('detail.exerciseHours')} value={checkin.exercise_hours} />
            <ScaleRow label={t('detail.exerciseIntensity')} value={checkin.exercise_intensity} />
          </Section>
        </>
      )}

      {symptomLabels.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.symptoms')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{symptomLabels.join(', ')}</Text>
          {checkin.symptoms.radiating_to && (
            <Text className="text-sm text-gray dark:text-gray">
              {t('detail.radiatingTo', { location: checkin.symptoms.radiating_to })}
            </Text>
          )}
        </View>
      )}

      {painAreaLabels.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.painAreas')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{painAreaLabels.join(', ')}</Text>
        </View>
      )}

      {checkin.triggers.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.triggers')}
          </Text>
          <View className="flex-row flex-wrap gap-2 ">
            {checkin.triggers.map((trigger) => (
              <View key={trigger} className="rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900/30">
                <Text className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t(TRIGGER_LABEL_KEYS[trigger] ?? trigger)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {checkin.exercise_notes && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.exerciseNotes')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{checkin.exercise_notes}</Text>
        </View>
      )}

      {checkin.notes && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">{t('detail.notes')}</Text>
          <Text className="text-base text-strongGray dark:text-white">{checkin.notes}</Text>
        </View>
      )}
    </View>
  );
}
