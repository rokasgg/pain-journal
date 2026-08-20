import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { PAIN_AREA_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface PainAreaChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const KNOWN_PAIN_AREAS = new Set(PAIN_AREA_OPTIONS.map((option) => option.value));

// PAIN_AREA_OPTIONS values are stored verbatim in symptoms.pain_areas, so they
// stay stable English identifiers — this maps each one to its i18n key for
// display, same decoupling as TRIGGER_OPTIONS/TRIGGER_LABEL_KEYS.
const PAIN_AREA_LABEL_KEYS: Record<string, string> = {
  Neck: 'painAreas.neck',
  'Upper back': 'painAreas.upperBack',
  'Mid back': 'painAreas.midBack',
  'Lower back': 'painAreas.lowerBack',
  'Shoulder (left)': 'painAreas.shoulderLeft',
  'Shoulder (right)': 'painAreas.shoulderRight',
  Head: 'painAreas.head',
  Hip: 'painAreas.hip',
  Arm: 'painAreas.arm',
  Leg: 'painAreas.leg',
};

export function PainAreaChips({ value, onChange, className }: PainAreaChipsProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [customText, setCustomText] = useState('');

  const toggle = (area: string) => {
    onChange(value.includes(area) ? value.filter((a) => a !== area) : [...value, area]);
  };

  const customAreas = value.filter((area) => !KNOWN_PAIN_AREAS.has(area));

  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustomText('');
    setIsAdding(false);
  };

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('checkin.painAreas')}</Text>
        <InfoButton
          title={t('checkin.painAreas')}
          message={t('checkin.painAreasInfo')}
        />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {PAIN_AREA_OPTIONS.map((option) => {
          const isActive = value.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`rounded-full px-3 py-2 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                }`}
            >
              <Text
                className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'
                  }`}
              >
                {t(PAIN_AREA_LABEL_KEYS[option.value] ?? option.label)}
              </Text>
            </Pressable>
          );
        })}

        {customAreas.map((area) => (
          <Pressable
            key={area}
            onPress={() => toggle(area)}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-2 dark:bg-primaryDark"
          >
            <Text className="text-sm font-medium text-white">{area}</Text>
            <Ionicons name="close" size={14} color={colors.white} />
          </Pressable>
        ))}

        {!isAdding && (
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border border-dashed border-gray-400 px-3 py-2 dark:border-gray-600"
          >
            <Ionicons name="add" size={14} color={colors.gray} />
            <Text className="text-sm font-medium text-gray-500 dark:text-gray">{t('common.other')}</Text>
          </Pressable>
        )}
      </View>

      {isAdding && (
        <View className="flex-row items-center gap-2">
          <TextInput
            autoFocus
            value={customText}
            onChangeText={setCustomText}
            onSubmitEditing={handleAddCustom}
            placeholder={t('checkin.addCustomPainAreaPlaceholder')}
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-black dark:border-gray-700 dark:bg-surfaceDark dark:text-white"
          />
          <Pressable
            onPress={handleAddCustom}
            accessibilityRole="button"
            className="rounded-lg bg-primary px-3 py-2 dark:bg-primaryDark"
          >
            <Text className="text-sm font-semibold text-white">{t('common.add')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCustomText('');
              setIsAdding(false);
            }}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={colors.gray} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
