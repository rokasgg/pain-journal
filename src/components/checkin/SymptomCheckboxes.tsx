import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { Input } from '@/components/ui/Input';
import { SYMPTOM_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { CheckinSymptoms } from '@/types/database.types';

export interface SymptomCheckboxesProps {
  value: CheckinSymptoms;
  onChange: (value: CheckinSymptoms) => void;
  className?: string;
}

export function SymptomCheckboxes({ value, onChange, className }: SymptomCheckboxesProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const checkedColor = isDark ? colors.primaryDark : colors.primary;
  const anySymptomChecked = SYMPTOM_OPTIONS.some((option) => value[option.value]);

  const toggle = (key: (typeof SYMPTOM_OPTIONS)[number]['value']) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('checkin.symptoms')}</Text>
        <InfoButton
          title={t('checkin.symptoms')}
          message={t('checkin.symptomsInfo')}
        />
      </View>

      <View className="gap-2">
        {SYMPTOM_OPTIONS.map((option) => {
          const checked = !!value[option.value];
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              className="flex-row items-center gap-3"
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={22}
                color={checked ? checkedColor : colors.gray}
              />
              <Text className="text-base text-black dark:text-white">{t(`symptoms.${option.value}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      {anySymptomChecked && (
        <Input
          label={t('checkin.radiatingTo')}
          placeholder={t('checkin.radiatingToPlaceholder')}
          value={value.radiating_to ?? ''}
          onChangeText={(text) => onChange({ ...value, radiating_to: text })}
        />
      )}
    </View>
  );
}
