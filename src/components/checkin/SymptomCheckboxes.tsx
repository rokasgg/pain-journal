import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { SYMPTOM_OPTIONS } from '@/constants/symptoms';
import { colors } from '@/lib/theme';
import type { CheckinSymptoms } from '@/types/database.types';

export interface SymptomCheckboxesProps {
  value: CheckinSymptoms;
  onChange: (value: CheckinSymptoms) => void;
  className?: string;
}

export function SymptomCheckboxes({ value, onChange, className }: SymptomCheckboxesProps) {
  const isDark = useColorScheme() === 'dark';
  const anySymptomChecked = SYMPTOM_OPTIONS.some((option) => value[option.value]);

  const toggle = (key: (typeof SYMPTOM_OPTIONS)[number]['value']) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <Text className="text-sm font-medium text-black dark:text-white">Symptoms</Text>

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
                color={checked ? (isDark ? colors.white : colors.black) : colors.gray}
              />
              <Text className="text-base text-black dark:text-white">{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {anySymptomChecked && (
        <Input
          label="Radiating to"
          placeholder="e.g. left shoulder"
          value={value.radiating_to ?? ''}
          onChangeText={(text) => onChange({ ...value, radiating_to: text })}
        />
      )}
    </View>
  );
}
