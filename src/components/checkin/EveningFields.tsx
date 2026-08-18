import { Controller, useWatch, type Control } from 'react-hook-form';
import { View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { YesNoField } from '@/components/checkin/YesNoField';
import { HoursMinutesPickerField } from '@/components/ui/HoursMinutesPickerField';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { EveningCheckinFormData } from '@/lib/validations/checkin';

export interface EveningFieldsProps {
  control: Control<EveningCheckinFormData>;
}

export function EveningFields({ control }: EveningFieldsProps) {
  const { t } = useTranslation();
  const didExercises = useWatch({ control, name: 'did_exercises' });

  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="activity_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label={t('checkin.activityLevel')}
            value={value}
            onChange={onChange}
            info={t('checkin.activityLevelInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="screen_time_hours"
        render={({ field: { value, onChange } }) => (
          <HoursMinutesPickerField
            label={t('checkin.screenTimeHours')}
            value={value}
            onChange={onChange}
            maxHours={16}
            info={t('checkin.screenTimeHoursInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="did_exercises"
        render={({ field: { value, onChange } }) => (
          <YesNoField
            label={t('checkin.didExercises')}
            value={value}
            onChange={onChange}
            info={t('checkin.didExercisesInfo')}
          />
        )}
      />

      {didExercises && (
        <>
          <Controller
            control={control}
            name="exercise_intensity"
            render={({ field: { value, onChange } }) => (
              <PainSlider
                label={t('checkin.exerciseIntensity')}
                value={value}
                onChange={onChange}
                minLabel={t('checkin.light')}
                maxLabel={t('checkin.intense')}
                info={t('checkin.exerciseIntensityInfo')}
              />
            )}
          />

          <Controller
            control={control}
            name="exercise_hours"
            render={({ field: { value, onChange } }) => (
              <HoursMinutesPickerField
                label={t('checkin.exerciseHours')}
                value={value}
                onChange={onChange}
                maxHours={4}
                info={t('checkin.exerciseHoursInfo')}
              />
            )}
          />

          <Controller
            control={control}
            name="exercise_notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label={t('checkin.exerciseNotes')}
                multiline
                numberOfLines={3}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                info={t('checkin.exerciseNotesInfo')}
              />
            )}
          />
        </>
      )}

      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('checkin.daySummary')}
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('checkin.daySummaryPlaceholder')}
            info={t('checkin.daySummaryInfo')}
          />
        )}
      />
    </View>
  );
}
