import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { MUSCLE_NAME_OPTIONS } from '@/constants/physio';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface MuscleNameFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** This user's previously-entered muscle names, most-recently-used first. */
  recentNames: string[];
  className?: string;
}

const MAX_RECENT_SUGGESTIONS = 5;
const MAX_PRESET_SUGGESTIONS = 8;

export function MuscleNameField({ label, value, onChange, onBlur, recentNames, className }: MuscleNameFieldProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = value.trim().toLowerCase();
  const recentSet = new Set(recentNames.map((name) => name.toLowerCase()));

  const matchingRecents = recentNames
    .filter((name) => name.toLowerCase().includes(query))
    .slice(0, MAX_RECENT_SUGGESTIONS);

  const matchingPresets = MUSCLE_NAME_OPTIONS.filter((option) => !recentSet.has(option.value.toLowerCase()))
    .map((option) => ({ value: option.value, label: t(option.labelKey) }))
    .filter((option) => option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query))
    .slice(0, MAX_PRESET_SUGGESTIONS);

  const showSuggestions = isFocused && (matchingRecents.length > 0 || matchingPresets.length > 0);

  const select = (name: string) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    onChange(name);
    setIsFocused(false);
  };

  return (
    <View className={className}>
      <Input
        label={label}
        placeholder={t('physioVisit.muscleNamePlaceholder')}
        value={value}
        onChangeText={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          onBlur?.();
          hideTimeout.current = setTimeout(() => setIsFocused(false), 150);
        }}
      />

      {showSuggestions && (
        <View className="mt-1 max-h-48 overflow-hidden rounded-lg border border-gray-300 bg-surface dark:border-gray-700 dark:bg-surfaceDark">
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {matchingRecents.map((name) => (
              <Pressable
                key={`recent-${name}`}
                onPress={() => select(name)}
                accessibilityRole="button"
                className="flex-row items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800"
              >
                <Ionicons name="time-outline" size={14} color={colors.gray} />
                <Text className="text-sm text-black dark:text-white">{name}</Text>
              </Pressable>
            ))}
            {matchingPresets.map((option) => (
              <Pressable
                key={`preset-${option.value}`}
                onPress={() => select(option.value)}
                accessibilityRole="button"
                className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800"
              >
                <Text className="text-sm text-black dark:text-white">{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
