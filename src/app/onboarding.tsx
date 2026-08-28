import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MultiSelectChips } from '@/components/onboarding/MultiSelectChips';
import { PainLocationsField } from '@/components/onboarding/PainLocationsField';
import { SingleSelectList } from '@/components/onboarding/SingleSelectList';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { WizardProgress } from '@/components/physioVisitWizard/WizardProgress';
import { DatePickerField } from '@/components/ui/DatePickerField';
import {
  CHECKIN_DEPTH_OPTIONS,
  INJURY_ONSET_PERIOD_OPTIONS,
  ONBOARDING_TOTAL_STEPS,
  PAIN_CHARACTER_OPTIONS,
  PAIN_RADIATES_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  WORST_TIME_OF_DAY_OPTIONS,
} from '@/constants/onboarding';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type {
  CheckinDepthPreference,
  InjuryOnsetPeriod,
  PainRadiates,
  PrimaryGoal,
  WorstTimeOfDay,
} from '@/types/database.types';
import { toast } from '@/utils/toast';

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingAnswers {
  injuryOnsetDate: string | null;
  injuryOnsetPeriod: InjuryOnsetPeriod | null;
  painLocations: string[];
  painCharacter: string[];
  painRadiates: PainRadiates | null;
  worstTimeOfDay: WorstTimeOfDay | null;
  primaryGoal: PrimaryGoal | null;
  checkinDepthPreference: CheckinDepthPreference | null;
  aiInsightsEnabled: boolean | null;
}

const initialAnswers: OnboardingAnswers = {
  injuryOnsetDate: null,
  injuryOnsetPeriod: null,
  painLocations: [],
  painCharacter: [],
  painRadiates: null,
  worstTimeOfDay: null,
  primaryGoal: null,
  checkinDepthPreference: null,
  aiInsightsEnabled: null,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  // Only steps 1 (onset), 4 (worst time), and 5 (goal + depth) require an
  // answer before continuing — locations/character/radiates (steps 2-3) and
  // the AI question (step 6, gated separately via canFinish) stay optional
  // or handled by their own button, matching the original 4-step version.
  const canGoNextFromStep1 = !!answers.injuryOnsetDate || !!answers.injuryOnsetPeriod;
  const canGoNextFromStep4 = !!answers.worstTimeOfDay;
  const canGoNextFromStep5 = !!answers.primaryGoal && !!answers.checkinDepthPreference;
  const canFinish = answers.aiInsightsEnabled !== null;

  const canGoNext =
    (step === 1 && canGoNextFromStep1) ||
    step === 2 ||
    step === 3 ||
    (step === 4 && canGoNextFromStep4) ||
    (step === 5 && canGoNextFromStep5);

  const handleFinish = async () => {
    setIsSaving(true);
    const { error } = await updateProfile.mutateAsync({
      onboarding_completed: true,
      injury_onset_date: answers.injuryOnsetDate,
      injury_onset_period: answers.injuryOnsetPeriod,
      pain_locations: answers.painLocations,
      pain_character: answers.painCharacter,
      pain_radiates: answers.painRadiates,
      worst_time_of_day: answers.worstTimeOfDay,
      primary_goal: answers.primaryGoal,
      checkin_depth_preference: answers.checkinDepthPreference,
      ai_insights_enabled: answers.aiInsightsEnabled ?? true,
    });
    setIsSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <WizardProgress step={step} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {step === 1 && (
          <View className="gap-3">
            <Text className="text-2xl font-bold text-black dark:text-white">{t('onboarding.onsetQuestion')}</Text>
            <DatePickerField
              value={answers.injuryOnsetDate}
              onChange={(date) => {
                set('injuryOnsetDate', date);
                set('injuryOnsetPeriod', null);
              }}
              maximumDate={new Date()}
            />
            <Text className="text-xs text-gray-500 dark:text-gray">{t('onboarding.onsetOrApprox')}</Text>
            <SingleSelectList
              options={INJURY_ONSET_PERIOD_OPTIONS}
              value={answers.injuryOnsetPeriod}
              onChange={(value) => {
                set('injuryOnsetPeriod', value);
                set('injuryOnsetDate', null);
              }}
            />
          </View>
        )}

        {step === 2 && (
          <View className="gap-3">
            <Text className="text-2xl font-bold text-black dark:text-white pb-4">
              {t('onboarding.locationsQuestion')}
            </Text>
            <PainLocationsField value={answers.painLocations} onChange={(v) => set('painLocations', v)} />
          </View>
        )}

        {step === 3 && (
          <>
            <Text className="text-2xl font-bold text-black dark:text-white">{t('onboarding.step1Title')}</Text>

            <View className="gap-3">
              <Text className="text-base font-medium text-black dark:text-white">
                {t('onboarding.characterQuestion')}
              </Text>
              <MultiSelectChips
                options={PAIN_CHARACTER_OPTIONS}
                value={answers.painCharacter}
                onChange={(v) => set('painCharacter', v)}
                otherLabelKey="onboarding.characterOther"
              />
            </View>

            <View className="gap-3">
              <Text className="text-base font-medium text-black dark:text-white">
                {t('onboarding.radiatesQuestion')}
              </Text>
              <SingleSelectList
                options={PAIN_RADIATES_OPTIONS}
                value={answers.painRadiates}
                onChange={(v) => set('painRadiates', v)}
              />
            </View>
          </>
        )}

        {step === 4 && (
          <View className="gap-3">
            <Text className="text-2xl font-bold text-black dark:text-white">
              {t('onboarding.worstTimeQuestion')}
            </Text>
            <SingleSelectList
              options={WORST_TIME_OF_DAY_OPTIONS}
              value={answers.worstTimeOfDay}
              onChange={(v) => set('worstTimeOfDay', v)}
            />
          </View>
        )}

        {step === 5 && (
          <>
            <Text className="text-2xl font-bold text-black dark:text-white">{t('onboarding.step3Title')}</Text>

            <View className="gap-3">
              <Text className="text-base font-medium text-black dark:text-white">{t('onboarding.goalQuestion')}</Text>
              <SingleSelectList
                options={PRIMARY_GOAL_OPTIONS}
                value={answers.primaryGoal}
                onChange={(v) => set('primaryGoal', v)}
              />
            </View>

            <View className="gap-3">
              <Text className="text-base font-medium text-black dark:text-white">{t('onboarding.depthQuestion')}</Text>
              <SingleSelectList
                options={CHECKIN_DEPTH_OPTIONS}
                value={answers.checkinDepthPreference}
                onChange={(v) => set('checkinDepthPreference', v)}
              />
            </View>
          </>
        )}

        {step === 6 && (
          <View className="gap-3">
            <Text className="text-2xl font-bold text-black dark:text-white">{t('onboarding.step4Title')}</Text>
            <Text className="text-base font-medium text-black dark:text-white">{t('onboarding.aiQuestion')}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray">{t('onboarding.aiExplanation')}</Text>
            <SingleSelectList
              options={[
                { value: 'yes', labelKey: 'onboarding.aiYes' },
                { value: 'no', labelKey: 'onboarding.aiNo' },
              ]}
              value={answers.aiInsightsEnabled === null ? null : answers.aiInsightsEnabled ? 'yes' : 'no'}
              onChange={(v) => set('aiInsightsEnabled', v === 'yes')}
            />
          </View>
        )}
      </ScrollView>

      <WizardFooter>
        {step > 1 && (
          <Pressable
            onPress={() => setStep((current) => (current - 1) as OnboardingStep)}
            className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
          </Pressable>
        )}

        {step < ONBOARDING_TOTAL_STEPS ? (
          <Pressable
            onPress={() => setStep((current) => (current + 1) as OnboardingStep)}
            disabled={!canGoNext}
            className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
          >
            <Text className="font-semibold text-white">{t('common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleFinish}
            disabled={!canFinish || isSaving}
            className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-semibold text-white">{t('onboarding.finish')}</Text>
            )}
          </Pressable>
        )}
      </WizardFooter>
    </SafeAreaView>
  );
}
