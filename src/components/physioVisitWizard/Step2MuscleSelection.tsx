import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { MUSCLE_CATEGORY_OPTIONS, MUSCLE_NAME_OPTIONS } from '@/constants/physio';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const OTHER_REGION = 'other';
const KNOWN_MUSCLE_VALUES = new Set(MUSCLE_NAME_OPTIONS.map((option) => option.value));

function labelForMuscle(value: string, t: (key: string) => string): string {
  const preset = MUSCLE_NAME_OPTIONS.find((option) => option.value === value);
  return preset ? t(preset.labelKey) : value;
}

export interface Step2MuscleSelectionProps {
  selectedMuscles: string[];
  onToggleMuscle: (value: string) => void;
  onAddCustomMuscle: (value: string) => void;
  onRemoveMuscle: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2MuscleSelection({
  selectedMuscles,
  onToggleMuscle,
  onAddCustomMuscle,
  onRemoveMuscle,
  onBack,
  onNext,
}: Step2MuscleSelectionProps) {
  const { t } = useTranslation();
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [customMuscleText, setCustomMuscleText] = useState('');

  const toggleRegion = (region: string) => {
    setExpandedRegion((prev) => (prev === region ? null : region));
  };

  const handleAddCustom = () => {
    const trimmed = customMuscleText.trim();
    if (trimmed && !selectedMuscles.includes(trimmed)) {
      onAddCustomMuscle(trimmed);
    }
    setCustomMuscleText('');
  };

  const customSelectedCount = selectedMuscles.filter((value) => !KNOWN_MUSCLE_VALUES.has(value)).length;
  const canContinue = selectedMuscles.length > 0;

  return (
    <View className="flex-1">
    <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-lg font-semibold text-black dark:text-white">
        {t('physioVisit.wizard.step2Title')}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {MUSCLE_CATEGORY_OPTIONS.map((option) => {
          const isExpanded = expandedRegion === option.value;
          const count = MUSCLE_NAME_OPTIONS.filter(
            (muscle) => muscle.category === option.value && selectedMuscles.includes(muscle.value),
          ).length;
          return (
            <Pressable
              key={option.value}
              onPress={() => toggleRegion(option.value)}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${isExpanded ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                }`}
            >
              <Text className={`text-sm font-medium ${isExpanded ? 'text-white' : 'text-black dark:text-white'}`}>
                {t(option.labelKey)}
              </Text>
              {count > 0 && (
                <View
                  className={`h-4 min-w-4 items-center justify-center rounded-full px-1 ${isExpanded ? 'bg-white/25' : 'bg-primary dark:bg-primaryDark'
                    }`}
                >
                  <Text className="text-xs font-semibold text-white">{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => toggleRegion(OTHER_REGION)}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${expandedRegion === OTHER_REGION ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
            }`}
        >
          <Text
            className={`text-sm font-medium ${expandedRegion === OTHER_REGION ? 'text-white' : 'text-black dark:text-white'
              }`}
          >
            {t('common.other')}
          </Text>
          {customSelectedCount > 0 && (
            <View
              className={`h-4 min-w-4 items-center justify-center rounded-full px-1 ${expandedRegion === OTHER_REGION ? 'bg-white/25' : 'bg-primary dark:bg-primaryDark'
                }`}
            >
              <Text className="text-xs font-semibold text-white">{customSelectedCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {expandedRegion && expandedRegion !== OTHER_REGION && (
        <View className="flex-row flex-wrap gap-2">
          {MUSCLE_NAME_OPTIONS.filter((option) => option.category === expandedRegion).map((option) => {
            const isActive = selectedMuscles.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => onToggleMuscle(option.value)}
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

      {expandedRegion === OTHER_REGION && (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={customMuscleText}
            onChangeText={setCustomMuscleText}
            onSubmitEditing={handleAddCustom}
            placeholder={t('physioVisit.muscleNamePlaceholder')}
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-black dark:border-gray-700 dark:bg-surfaceDark dark:text-white"
          />
          <Pressable onPress={handleAddCustom} className="rounded-lg bg-primary px-3 py-2 dark:bg-primaryDark">
            <Text className="text-sm font-semibold text-white">{t('common.add')}</Text>
          </Pressable>
        </View>
      )}

      {selectedMuscles.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
            {t('physioVisit.wizard.selectedMusclesTitle')}
          </Text>
          <View className="gap-2">
            {selectedMuscles.map((value) => (
              <View
                key={value}
                className="flex-row items-center justify-between rounded-lg bg-surface px-3 py-2.5 dark:bg-surfaceDark"
              >
                <Text className="text-sm text-black dark:text-white">{labelForMuscle(value, t)}</Text>
                <Pressable onPress={() => onRemoveMuscle(value)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.gray} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

    </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onBack}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('physioVisit.wizard.backButton')}</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          disabled={!canContinue}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          <Text className="font-semibold text-white">{t('physioVisit.wizard.continueButton')}</Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}
