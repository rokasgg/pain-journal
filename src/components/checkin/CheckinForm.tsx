import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EveningFields } from '@/components/checkin/EveningFields';
import { FlareUpFollowUpStep } from '@/components/checkin/FlareUpFollowUpStep';
import { MorningFields } from '@/components/checkin/MorningFields';
import { PainAreaChips } from '@/components/checkin/PainAreaChips';
import { PainSlider } from '@/components/checkin/PainSlider';
import { StepDots } from '@/components/checkin/StepDots';
import { SymptomCheckboxes } from '@/components/checkin/SymptomCheckboxes';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { YesNoField } from '@/components/checkin/YesNoField';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import {
  eveningCheckinSchema,
  morningCheckinSchema,
  type EveningCheckinFormData,
  type MorningCheckinFormData,
} from '@/lib/validations/checkin';
import type { CheckinType, FlareUp } from '@/types/database.types';
import { toast } from '@/utils/toast';

export type CheckinFormData = MorningCheckinFormData | EveningCheckinFormData;

const TOTAL_STEPS = 3;

export const morningDefaults: MorningCheckinFormData = {
  pain_level: 0,
  stiffness_level: null,
  range_of_motion: null,
  symptoms: {},
  triggers: [],
  notes: null,
  sleep_quality: null,
  sleep_hours: null,
  woke_up_with_pain: null,
  sleep_position: null,
};

export const eveningDefaults: EveningCheckinFormData = {
  pain_level: 0,
  stiffness_level: null,
  range_of_motion: null,
  symptoms: {},
  triggers: [],
  notes: null,
  activity_level: null,
  screen_time_hours: null,
  did_exercises: null,
  exercise_notes: null,
  exercise_hours: null,
  exercise_intensity: null,
};

export interface CheckinFormProps {
  type: CheckinType;
  defaultValues?: CheckinFormData;
  submitLabel: string;
  // Performs the actual save and reports the outcome instead of navigating
  // itself: `{ error }` on success or failure, or `undefined` when the save
  // was intentionally short-circuited (e.g. a confirm dialog needs to be
  // shown first) — in that case the form just resets, no error/success UI.
  onSubmit: (data: CheckinFormData) => Promise<{ error: string | null } | undefined>;
  // Called right after a successful save — do the toast + navigation here,
  // not in onSubmit, so a short-circuited/failed save never navigates. The
  // success toast itself (toast.success, via ToastModalHost) is what plays
  // the checkmark animation now, not this form's submit button.
  onSaved?: () => void;
  header?: ReactNode;
  flareUpCandidate?: FlareUp | null;
}

export function CheckinForm({
  type,
  defaultValues,
  submitLabel,
  onSubmit,
  onSaved,
  header,
  flareUpCandidate,
}: CheckinFormProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const isMorning = type === 'morning';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flareUpStepDone, setFlareUpStepDone] = useState(false);

  // Onboarding's "how much time per check-in" answer: 'quick' collapses the
  // Symptoms/Triggers step into an optional expandable section on step 2
  // instead of forcing a 3rd required step. 'detailed'/'varies'/unset behave
  // exactly as before (3 full steps).
  const isQuickMode = profile?.checkin_depth_preference === 'quick';
  const totalSteps = isQuickMode ? 2 : TOTAL_STEPS;
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const resolvedDefaultValues = defaultValues
    ? defaultValues
    : {
      ...(isMorning ? morningDefaults : eveningDefaults),
      // Onboarding's "does pain radiate" answer: pre-check the two most
      // likely symptoms on a fresh check-in (never overrides a saved entry).
      symptoms:
        profile?.pain_radiates === 'yes' ? { tingling: true, numbness: true } : {},
    };

  const { control, handleSubmit } = useForm<CheckinFormData>({
    resolver: zodResolver(isMorning ? morningCheckinSchema : eveningCheckinSchema),
    defaultValues: resolvedDefaultValues,
  });

  // Morning has a real persisted gate (`woke_up_with_pain`); evening has no DB
  // equivalent, so its gate is local UI state derived from whether pain_level
  // was already > 0 (fully reconstructable — no schema/DB change needed).
  const wokeUpWithPain = useWatch({
    control: control as Control<MorningCheckinFormData>,
    name: 'woke_up_with_pain',
  });
  const [eveningInPain, setEveningInPain] = useState(() => (defaultValues?.pain_level ?? 0) > 0);
  const isInPain = isMorning ? !!wokeUpWithPain : eveningInPain;

  const handleSave = async (data: CheckinFormData) => {
    const finalData: CheckinFormData = isInPain
      ? data
      : { ...data, pain_level: 0, triggers: [], symptoms: { ...data.symptoms, pain_areas: [] } };

    setIsSubmitting(true);
    const result = await onSubmit(finalData);

    if (!result) {
      // Save was intentionally short-circuited (e.g. a confirm dialog needs
      // to be shown first) — just reset, no error/success UI.
      setIsSubmitting(false);
      return;
    }

    if (result.error) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    // No success animation on the button itself — the toast shown by onSaved
    // (via toast.success) already plays the checkmark, ToastModalHost.tsx.
    setIsSubmitting(false);
    onSaved?.();
  };

  if (flareUpCandidate && !flareUpStepDone) {
    return (
      <View className="flex-1 bg-background dark:bg-backgroundDark">
        <Stack.Screen options={{ headerRight: () => <StepDots step={0} totalSteps={totalSteps} /> }} />
        <FlareUpFollowUpStep flareUp={flareUpCandidate} onDone={() => setFlareUpStepDone(true)} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <Stack.Screen options={{ headerRight: () => <StepDots step={step} totalSteps={totalSteps} /> }} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {step === 1 && (
          <>
            {header}

            {isMorning ? (
              <Controller
                control={control as Control<MorningCheckinFormData>}
                name="woke_up_with_pain"
                render={({ field: { value, onChange } }) => (
                  <YesNoField
                    label={t('checkin.wokeUpWithPain')}
                    value={value}
                    onChange={onChange}
                    info={t('checkin.wokeUpWithPainInfo')}
                  />
                )}
              />
            ) : (
              <YesNoField
                label={t('checkin.inPainNow')}
                value={eveningInPain}
                onChange={setEveningInPain}
                info={t('checkin.inPainNowInfo')}
              />
            )}

            {isInPain && (
              <>
                <Controller
                  control={control}
                  name="pain_level"
                  render={({ field: { value, onChange } }) => (
                    <PainSlider
                      label={t('checkin.painLevel')}
                      value={value}
                      onChange={onChange}
                      info={t('checkin.painLevelInfo')}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="symptoms.pain_areas"
                  render={({ field: { value, onChange } }) => (
                    <PainAreaChips value={value ?? []} onChange={onChange} />
                  )}
                />
              </>
            )}

            <Controller
              control={control}
              name="stiffness_level"
              render={({ field: { value, onChange } }) => (
                <PainSlider
                  label={t('checkin.stiffness')}
                  value={value}
                  onChange={onChange}
                  minLabel={t('checkin.flexible')}
                  maxLabel={t('checkin.rigid')}
                  info={t('checkin.stiffnessInfo')}
                />
              )}
            />

            <Controller
              control={control}
              name="range_of_motion"
              render={({ field: { value, onChange } }) => (
                <PainSlider
                  label={t('checkin.rangeOfMotion')}
                  value={value}
                  onChange={onChange}
                  minLabel={t('checkin.limited')}
                  maxLabel={t('checkin.full')}
                  info={t('checkin.rangeOfMotionInfo')}
                />
              )}
            />
          </>
        )}

        {step === 2 && (
          <>
            {isMorning ? (
              <MorningFields control={control as Control<MorningCheckinFormData>} />
            ) : (
              <EveningFields control={control as Control<EveningCheckinFormData>} />
            )}

            {isQuickMode &&
              (!showMoreDetails ? (
                <Pressable
                  onPress={() => setShowMoreDetails(true)}
                  accessibilityRole="button"
                  className="items-center rounded-lg border border-dashed border-gray-400 py-3 dark:border-gray-600"
                >
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray">
                    {t('checkin.addMoreDetails')}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Controller
                    control={control}
                    name="symptoms"
                    render={({ field: { value, onChange } }) => (
                      <SymptomCheckboxes value={value} onChange={onChange} />
                    )}
                  />

                  {isInPain && (
                    <Controller
                      control={control}
                      name="triggers"
                      render={({ field: { value, onChange } }) => (
                        <TriggerChips value={value} onChange={onChange} />
                      )}
                    />
                  )}
                </>
              ))}
          </>
        )}

        {!isQuickMode && step === 3 && (
          <>
            <Controller
              control={control}
              name="symptoms"
              render={({ field: { value, onChange } }) => (
                <SymptomCheckboxes value={value} onChange={onChange} />
              )}
            />

            {isInPain && (
              <Controller
                control={control}
                name="triggers"
                render={({ field: { value, onChange } }) => <TriggerChips value={value} onChange={onChange} />}
              />
            )}
          </>
        )}
      </ScrollView>

      <WizardFooter>
        {step > 1 && (
          <Pressable
            onPress={() => setStep((current) => (current - 1) as 1 | 2)}
            className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
          </Pressable>
        )}

        {step < totalSteps ? (
          <Pressable
            onPress={() => setStep((current) => (current + 1) as 2 | 3)}
            className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark"
          >
            <Text className="font-semibold text-white">{t('common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit(handleSave)}
            disabled={isSubmitting}
            className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-semibold text-white">{submitLabel}</Text>
            )}
          </Pressable>
        )}
      </WizardFooter>
    </View>
  );
}
