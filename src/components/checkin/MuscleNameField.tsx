import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { MUSCLE_CATEGORY_OPTIONS, MUSCLE_NAME_OPTIONS } from '@/constants/physio';
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

const OTHER_CATEGORY = 'other';

function findCategoryForValue(value: string): string | null {
  if (!value) return null;
  const match = MUSCLE_NAME_OPTIONS.find((option) => option.value === value);
  if (match) return match.category;
  return OTHER_CATEGORY;
}

export function MuscleNameField({ label, value, onChange, onBlur, recentNames, className }: MuscleNameFieldProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(() => findCategoryForValue(value));

  const muscleOptions = MUSCLE_NAME_OPTIONS.filter((option) => option.category === activeCategory);

  return (
    <View className={className}>
      <Text className="mb-1.5 text-sm font-medium text-black dark:text-white">{label}</Text>

      {recentNames.length > 0 && (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {recentNames.map((name) => {
            const isActive = value === name;
            return (
              <Pressable
                key={`recent-${name}`}
                onPress={() => {
                  onChange(name);
                  setActiveCategory(findCategoryForValue(name));
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                  }`}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={isActive ? colors.white : colors.gray}
                />
                <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View className="flex-row flex-wrap gap-2">
        {MUSCLE_CATEGORY_OPTIONS.map((option) => {
          const isActive = activeCategory === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setActiveCategory(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`rounded-full px-3 py-1.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                }`}
            >
              <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setActiveCategory(OTHER_CATEGORY)}
          accessibilityRole="button"
          accessibilityState={{ selected: activeCategory === OTHER_CATEGORY }}
          className={`rounded-full px-3 py-1.5 ${activeCategory === OTHER_CATEGORY ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
            }`}
        >
          <Text
            className={`text-sm font-medium ${activeCategory === OTHER_CATEGORY ? 'text-white' : 'text-black dark:text-white'
              }`}
          >
            {t('common.other')}
          </Text>
        </Pressable>
      </View>

      {activeCategory && activeCategory !== OTHER_CATEGORY && (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {muscleOptions.map((option) => {
            const isActive = value === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                className={`rounded-full px-3 py-1.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                  }`}
              >
                <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {activeCategory === OTHER_CATEGORY && (
        <Input
          className="mt-2"
          placeholder={t('physioVisit.muscleNamePlaceholder')}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
        />
      )}
    </View>
  );
}
