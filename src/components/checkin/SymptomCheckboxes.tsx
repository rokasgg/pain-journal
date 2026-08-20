import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { Input } from '@/components/ui/Input';
import { SYMPTOM_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { CheckinSymptoms } from '@/types/database.types';

export interface SymptomCheckboxesProps {
  value: CheckinSymptoms;
  onChange: (value: CheckinSymptoms) => void;
  className?: string;
}

export function SymptomCheckboxes({ value, onChange, className }: SymptomCheckboxesProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [customText, setCustomText] = useState('');

  const customSymptoms = value.custom ?? [];
  const anySymptomChecked = SYMPTOM_OPTIONS.some((option) => value[option.value]) || customSymptoms.length > 0;

  const toggle = (key: (typeof SYMPTOM_OPTIONS)[number]['value']) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const removeCustom = (symptom: string) => {
    onChange({ ...value, custom: customSymptoms.filter((s) => s !== symptom) });
  };

  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !customSymptoms.includes(trimmed)) {
      onChange({ ...value, custom: [...customSymptoms, trimmed] });
    }
    setCustomText('');
    setIsAdding(false);
  };

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm font-medium text-strongGray dark:text-white">{t('checkin.symptoms')}</Text>
        <InfoButton
          title={t('checkin.symptoms')}
          message={t('checkin.symptomsInfo')}
        />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {SYMPTOM_OPTIONS.map((option) => {
          const isActive = !!value[option.value];
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
                {t(`symptoms.${option.value}`)}
              </Text>
            </Pressable>
          );
        })}

        {customSymptoms.map((symptom) => (
          <Pressable
            key={symptom}
            onPress={() => removeCustom(symptom)}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-2 dark:bg-primaryDark"
          >
            <Text className="text-sm font-medium text-white">{symptom}</Text>
            <Ionicons name="close" size={14} color={colors.white} />
          </Pressable>
        ))}

        {!isAdding && (
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border border-dashed border-gray px-3 py-2 dark:border-gray"
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
            placeholder={t('checkin.addCustomSymptomPlaceholder')}
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-lg border border-gray bg-surface px-3 py-2 text-black dark:border-gray dark:bg-surfaceDark dark:text-white"
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

      {anySymptomChecked && (
        <Input
          label={t('checkin.radiatingTo')}
          placeholder={t('checkin.radiatingToPlaceholder')}
          value={value.radiating_to ?? ''}
          onChangeText={(text) => onChange({ ...value, radiating_to: text })}
        />
      )}
    </View>
  );
}
