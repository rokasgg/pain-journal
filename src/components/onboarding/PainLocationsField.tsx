import { Pressable, Text, View } from 'react-native';

import { PAIN_LOCATION_OPTIONS } from '@/constants/onboarding';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface PainLocationsFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

// Flat, single-level multi-select of broad body regions — no accordion, no
// second-level muscle picker. That level of detail (category → specific
// muscle, e.g. "Levator scapulae") stays exclusive to the physio visit log
// form's MuscleNameField.tsx; onboarding only needs a quick toggle list.
export function PainLocationsField({ value, onChange, className }: PainLocationsFieldProps) {
  const { t } = useTranslation();

  const toggle = (location: string) => {
    onChange(value.includes(location) ? value.filter((v) => v !== location) : [...value, location]);
  };

  return (
    <View className={`flex-row flex-wrap gap-2 ${className ?? ''}`}>
      {PAIN_LOCATION_OPTIONS.map((option) => {
        const isActive = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => toggle(option.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isActive }}
            className={`rounded-full px-3 py-2 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
              }`}
          >
            <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
