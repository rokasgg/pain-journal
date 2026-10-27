import { Controller, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { HoursMinutesPickerField } from '@/components/ui/HoursMinutesPickerField';
import { InfoButton } from '@/components/ui/InfoButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Input } from '@/components/ui/Input';
import { SLEEP_POSITION_OPTIONS } from '@/constants/symptoms';
import type { CheckinSliderHints } from '@/lib/checkinHints';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { MorningCheckinFormData } from '@/lib/validations/checkin';

export interface MorningFieldsProps {
  control: Control<MorningCheckinFormData>;
  hints?: CheckinSliderHints;
  // Previous morning's sleep quality, for the ring on the track.
  previousSleep?: number | null;
}

export function MorningFields({ control, hints, previousSleep }: MorningFieldsProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-6">
      <View className="gap-3">
        <SectionTitle title={t('checkin.sleepQuality')} info={t('checkin.sleepQualityInfo')} />
        <Controller
          control={control}
          name="sleep_quality"
          render={({ field: { value, onChange } }) => (
            <ScaleSliderCard
              preset="sleep"
              value={value}
              onChange={onChange}
              previous={previousSleep}
              hint={hints?.sleep_quality}
              accessibilityLabel={t('checkin.sleepQuality')}
            />
          )}
        />
      </View>

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
        name="sleep_position"
        render={({ field: { value, onChange } }) => (
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-medium text-strongGray dark:text-white">{t('checkin.sleepPosition')}</Text>
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
                    className={`flex-1 items-center rounded-lg py-2.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                      }`}
                  >
                    <Text
                      className={`text-sm font-medium ${isActive ? 'text-white' : 'text-strongGray dark:text-white'
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

      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('checkin.morningNotes')}
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('checkin.morningNotesPlaceholder')}
          />
        )}
      />
    </View>
  );
}
