import { Ionicons } from '@expo/vector-icons';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { MuscleNameField } from '@/components/checkin/MuscleNameField';
import { PainSlider } from '@/components/checkin/PainSlider';
import { MUSCLE_SIDE_OPTIONS, MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { PhysioAssessmentFormData } from '@/lib/validations/physioAssessment';

export interface MuscleFindingRowProps {
  control: Control<PhysioAssessmentFormData>;
  index: number;
  onRemove: () => void;
  removable: boolean;
  recentMuscleNames: string[];
}

export function MuscleFindingRow({ control, index, onRemove, removable, recentMuscleNames }: MuscleFindingRowProps) {
  const { t } = useTranslation();
  const status = useWatch({ control, name: `findings.${index}.status` });

  return (
    <View className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
      <View className="flex-row items-start gap-2">
        <Controller
          control={control}
          name={`findings.${index}.muscle_name`}
          render={({ field: { value, onChange, onBlur } }) => (
            <MuscleNameField
              className="flex-1"
              label={t('physioVisit.muscleName', { number: index + 1 })}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              recentNames={recentMuscleNames}
            />
          )}
        />
        {removable && (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            hitSlop={8}
            className="mt-8"
          >
            <Ionicons name="close-circle" size={22} color={colors.gray} />
          </Pressable>
        )}
      </View>

      <View className="mt-4 gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.status')}</Text>
        <Controller
          control={control}
          name={`findings.${index}.status`}
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap gap-2">
              {MUSCLE_STATUS_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-full px-3 py-1.5 ${isActive ? option.activeClassName : 'bg-primaryMuted dark:bg-primaryMutedDark'
                      }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isActive ? option.activeTextClassName : 'text-black dark:text-white'
                      }`}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      <View className="mt-4 gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.side')}</Text>
        <Controller
          control={control}
          name={`findings.${index}.side`}
          render={({ field: { value, onChange } }) => (
            <View className="flex-row gap-2">
              {MUSCLE_SIDE_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange(isActive ? null : option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-full border px-3 py-1.5 ${isActive
                      ? 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
                      : 'border-gray-300 dark:border-gray-700'
                      }`}
                  >
                    <Text className="text-sm text-black dark:text-white">{t(option.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      {(status === 'weak' || status === 'tight') && (
        <Controller
          control={control}
          name={`findings.${index}.severity`}
          render={({ field: { value, onChange } }) => (
            <PainSlider className="mt-4" label={t('physioVisit.severity')} value={value} onChange={onChange} />
          )}
        />
      )}
    </View>
  );
}
