import { Controller, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { HoursMinutesPickerField } from '@/components/ui/HoursMinutesPickerField';
import { InfoButton } from '@/components/ui/InfoButton';
import { SLEEP_POSITION_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { MorningCheckinFormData } from '@/lib/validations/checkin';

export interface MorningFieldsProps {
  control: Control<MorningCheckinFormData>;
}

export function MorningFields({ control }: MorningFieldsProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="sleep_quality"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label={t('checkin.sleepQuality')}
            value={value}
            onChange={onChange}
            minLabel={t('checkin.sleepBad')}
            maxLabel={t('checkin.sleepGood')}
            info={t('checkin.sleepQualityInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="sleep_hours"
        render={({ field: { value, onChange } }) => (
          <HoursMinutesPickerField
            label={t('checkin.sleepHours')}
            value={value}
            onChange={onChange}
            maxHours={14}
            info={t('checkin.sleepHoursInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="woke_up_with_pain"
        render={({ field: { value, onChange } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            className="flex-row items-center justify-between rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base text-black dark:text-white">{t('checkin.wokeUpWithPain')}</Text>
              <InfoButton
                title={t('checkin.wokeUpWithPain')}
                message={t('checkin.wokeUpWithPainInfo')}
              />
            </View>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {value ? t('common.yes') : t('common.no')}
            </Text>
          </Pressable>
        )}
      />

      <Controller
        control={control}
        name="sleep_position"
        render={({ field: { value, onChange } }) => (
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-medium text-black dark:text-white">{t('checkin.sleepPosition')}</Text>
              <InfoButton
                title={t('checkin.sleepPosition')}
                message={t('checkin.sleepPositionInfo')}
              />
            </View>
            <View className="flex-row gap-2">
              {SLEEP_POSITION_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`flex-1 items-center rounded-lg py-2.5 ${
                      isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isActive ? 'text-white' : 'text-black dark:text-white'
                      }`}
                    >
                      {t(`sleepPosition.${option.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />
    </View>
  );
}
