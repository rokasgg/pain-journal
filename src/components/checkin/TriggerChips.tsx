import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { TRIGGER_OPTIONS } from '@/constants/symptoms';
import { colors } from '@/lib/theme';

export interface TriggerChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const KNOWN_TRIGGERS = new Set(TRIGGER_OPTIONS.map((option) => option.value));

export function TriggerChips({ value, onChange, className }: TriggerChipsProps) {
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
        <Text className="text-sm font-medium text-black dark:text-white">Triggers</Text>
        <InfoButton
          title="Triggers"
          message="Anything you think may have contributed to today's pain — a long drive, poor posture, stress, and so on."
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
            className="flex-row items-center gap-1 rounded-full border border-dashed border-gray-400 px-3 py-2 dark:border-gray-600"
          >
            <Ionicons name="add" size={14} color={colors.gray} />
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Other</Text>
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
            placeholder="What do you think triggered it?"
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-black dark:border-gray-700 dark:bg-surfaceDark dark:text-white"
          />
          <Pressable
            onPress={handleAddCustom}
            accessibilityRole="button"
            className="rounded-lg bg-primary px-3 py-2 dark:bg-primaryDark"
          >
            <Text className="text-sm font-semibold text-white">Add</Text>
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
