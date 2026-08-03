import { Pressable, Text, View } from 'react-native';

import { TRIGGER_OPTIONS } from '@/constants/symptoms';

export interface TriggerChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export function TriggerChips({ value, onChange, className }: TriggerChipsProps) {
  const toggle = (trigger: string) => {
    onChange(value.includes(trigger) ? value.filter((t) => t !== trigger) : [...value, trigger]);
  };

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <Text className="text-sm font-medium text-black dark:text-white">Triggers</Text>
      <View className="flex-row flex-wrap gap-2">
        {TRIGGER_OPTIONS.map((option) => {
          const isActive = value.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`rounded-full px-3 py-2 ${
                isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-white' : 'text-black dark:text-white'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
