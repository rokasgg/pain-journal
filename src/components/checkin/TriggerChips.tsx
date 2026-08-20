import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { TRIGGER_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface TriggerChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const KNOWN_TRIGGERS = new Set(TRIGGER_OPTIONS.map((option) => option.value));

// TRIGGER_OPTIONS values are stored verbatim in the DB (triggers text[]), so
// they stay stable English identifiers — this maps each one to its i18n key
// for display, independent of any custom trigger text the user types in.
const TRIGGER_LABEL_KEYS: Record<string, string> = {
  'Long drive': 'triggers.longDrive',
  'Desk work': 'triggers.deskWork',
  'Poor posture': 'triggers.poorPosture',
  'Poor sleep': 'triggers.poorSleep',
  'Cold weather': 'triggers.coldWeather',
  'Heavy lifting': 'triggers.heavyLifting',
  Stress: 'triggers.stress',
  Unknown: 'triggers.unknown',
};

export function TriggerChips({ value, onChange, className }: TriggerChipsProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [customText, setCustomText] = useState('');

  const toggle = (trigger: string) => {
    onChange(value.includes(trigger) ? value.filter((t) => t !== trigger) : [...value, trigger]);
  };

  const customTriggers = value.filter((trigger) => !KNOWN_TRIGGERS.has(trigger));

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
        <Text className="text-sm font-medium text-strongGray dark:text-white">{t('checkin.triggers')}</Text>
        <InfoButton
          title={t('checkin.triggers')}
          message={t('checkin.triggersInfo')}
        />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {TRIGGER_OPTIONS.map((option) => {
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
                className={`text-sm font-medium ${isActive ? 'text-white' : 'text-strongGray dark:text-white'
                  }`}
              >
                {t(TRIGGER_LABEL_KEYS[option.value] ?? option.label)}
              </Text>
            </Pressable>
          );
        })}

        {customTriggers.map((trigger) => (
          <Pressable
            key={trigger}
            onPress={() => toggle(trigger)}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-2 dark:bg-primaryDark"
          >
            <Text className="text-sm font-medium text-white">{trigger}</Text>
            <Ionicons name="close" size={14} color={colors.white} />
          </Pressable>
        ))}

        {!isAdding && (
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border border-dashed border-gray px-3 py-2 dark:border-gray-600"
          >
            <Ionicons name="add" size={14} color={colors.gray} />
            <Text className="text-sm font-medium text-gray dark:text-gray">{t('common.other')}</Text>
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
            placeholder={t('checkin.addCustomPlaceholder')}
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
