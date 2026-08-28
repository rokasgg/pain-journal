import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface SingleSelectOption<T extends string> {
  value: T;
  labelKey: string;
  descriptionKey?: string;
}

export interface SingleSelectListProps<T extends string> {
  options: SingleSelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}

export function SingleSelectList<T extends string>({
  options,
  value,
  onChange,
  className,
}: SingleSelectListProps<T>) {
  const { t } = useTranslation();

  return (
    <View className={`gap-2.5 ${className ?? ''}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            className={`flex-row items-center gap-3 rounded-xl border px-4 py-3.5 ${isActive
              ? 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
              : 'border-gray-200 bg-surface dark:border-gray-800 dark:bg-surfaceDark'
              }`}
          >
            <Ionicons
              name={isActive ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={isActive ? colors.primary : colors.gray}
            />
            <View className="flex-1">
              <Text className="text-base text-black dark:text-white">{t(option.labelKey)}</Text>
              {option.descriptionKey && (
                <Text className="text-xs text-gray-500 dark:text-gray">{t(option.descriptionKey)}</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
