import { Controller, useWatch, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { InfoButton } from '@/components/ui/InfoButton';
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
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('checkin.screenTimeHours')}
            keyboardType="decimal-pad"
            value={value?.toString() ?? ''}
            onChangeText={(text) => onChange(text ? Number(text) : null)}
            onBlur={onBlur}
            info={t('checkin.screenTimeHoursInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="did_exercises"
        render={({ field: { value, onChange } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            className="flex-row items-center justify-between rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base text-black dark:text-white">{t('checkin.didExercises')}</Text>
              <InfoButton
                title={t('checkin.didExercises')}
                message={t('checkin.didExercisesInfo')}
              />
            </View>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {value ? t('common.yes') : t('common.no')}
            </Text>
          </Pressable>
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
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label={t('checkin.exerciseHours')}
                keyboardType="decimal-pad"
                value={value?.toString() ?? ''}
                onChangeText={(text) => onChange(text ? Number(text) : null)}
                onBlur={onBlur}
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
