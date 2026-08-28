import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

export interface MultiSelectOption {
  value: string;
  labelKey: string;
}

export interface MultiSelectChipsProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  otherLabelKey?: string;
  className?: string;
}

export function MultiSelectChips({ options, value, onChange, otherLabelKey, className }: MultiSelectChipsProps) {
  const { t } = useTranslation();

  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <View className={`flex-row flex-wrap gap-2 ${className ?? ''}`}>
      {options.map((option) => {
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
      {otherLabelKey && (
        <Pressable
          onPress={() => toggle('other')}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value.includes('other') }}
          className={`rounded-full px-3 py-2 ${value.includes('other') ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
            }`}
        >
          <Text className={`text-sm font-medium ${value.includes('other') ? 'text-white' : 'text-black dark:text-white'}`}>
            {t(otherLabelKey)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
