import { Pressable, Text, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

export interface YesNoFieldProps {
  label: string;
  // null = not answered yet — neither option is highlighted.
  value: boolean | null;
  onChange: (value: boolean) => void;
  info?: string;
  // Inline required-answer message (e.g. a check-in step's "Answer this to continue").
  error?: string;
  className?: string;
}

// Two explicit buttons, deliberately not a Switch: a switch has no "not
// answered" state, so Off would silently mean No — which is how untouched
// check-ins used to save as pain-free days.
export function YesNoField({ label, value, onChange, info, error, className }: YesNoFieldProps) {
  const { t } = useTranslation();

  const options = [
    { answer: true, label: t('common.yes') },
    { answer: false, label: t('common.no') },
  ];

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-base text-strongGray dark:text-white">{label}</Text>
        {info && <InfoButton title={label} message={info} />}
      </View>

      <View
        accessibilityRole="radiogroup"
        className={`flex-row gap-1 rounded-lg border bg-surface p-1 dark:bg-surfaceDark ${
          error ? 'border-red-600 dark:border-red-500' : 'border-transparent'
        }`}
      >
        {options.map((option) => {
          const isSelected = value === option.answer;
          return (
            <Pressable
              key={String(option.answer)}
              onPress={() => {
                if (isSelected) return;
                haptics.tick();
                onChange(option.answer);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label}: ${option.label}`}
              className={`flex-1 items-center rounded-md py-2.5 ${isSelected ? 'bg-primary dark:bg-primaryDark' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-strongGray dark:text-gray'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Text className="text-sm text-red-600 dark:text-red-500">{error}</Text>}
    </View>
  );
}
