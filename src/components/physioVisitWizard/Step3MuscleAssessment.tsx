import { Pressable, ScrollView, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { MUSCLE_NAME_OPTIONS, MUSCLE_SIDE_OPTIONS, MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { MuscleFindingDraft } from '@/lib/physioSuggestedQuestions';

export interface Step3MuscleAssessmentProps {
  muscleValue: string;
  index: number;
  total: number;
  finding: MuscleFindingDraft;
  onChange: (finding: MuscleFindingDraft) => void;
  onBack: () => void;
  onNext: () => void;
}

function labelForMuscle(value: string, t: (key: string) => string): string {
  const preset = MUSCLE_NAME_OPTIONS.find((option) => option.value === value);
  return preset ? t(preset.labelKey) : value;
}

export function Step3MuscleAssessment({
  muscleValue,
  index,
  total,
  finding,
  onChange,
  onBack,
  onNext,
}: Step3MuscleAssessmentProps) {
  const { t } = useTranslation();
  const isLast = index === total - 1;

  return (
    <View className="flex-1">
    <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
      <View className="gap-1">
        {total > 1 && (
          <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
            {t('physioVisit.wizard.muscleProgress', { index: index + 1, total })}
          </Text>
        )}
        <Text className="text-lg font-semibold text-black dark:text-white">{labelForMuscle(muscleValue, t)}</Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.status')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {MUSCLE_STATUS_OPTIONS.map((option) => {
            const isActive = finding.status === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange({ ...finding, status: option.value })}
                className={`rounded-full px-3 py-1.5 ${isActive ? option.activeClassName : 'bg-primaryMuted dark:bg-primaryMutedDark'
                  }`}
              >
                <Text
                  className={`text-sm font-medium ${isActive ? option.activeTextClassName : 'text-black dark:text-white'
                    }`}
                >
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.side')}</Text>
        <View className="flex-row gap-2">
          {MUSCLE_SIDE_OPTIONS.map((option) => {
            const isActive = finding.side === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange({ ...finding, side: isActive ? null : option.value })}
                className={`rounded-full border px-3 py-1.5 ${isActive
                    ? 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
                    : 'border-gray-300 dark:border-gray-700'
                  }`}
              >
                <Text className="text-sm text-black dark:text-white">{t(option.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.severity')}</Text>
          {finding.severity === null && (
            <Text className="text-sm text-gray-500 dark:text-gray">{t('physioVisit.wizard.severityNone')}</Text>
          )}
        </View>
        <PainSlider
          label=""
          value={finding.severity ?? 0}
          onChange={(value) => onChange({ ...finding, severity: value })}
        />
      </View>

    </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onBack}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('physioVisit.wizard.backButton')}</Text>
        </Pressable>
        <Pressable onPress={onNext} className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark">
          <Text className="font-semibold text-white">
            {isLast ? t('physioVisit.wizard.continueButton') : t('physioVisit.wizard.nextMuscleButton')}
          </Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}
