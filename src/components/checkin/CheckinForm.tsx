import { Ionicons } from '@expo/vector-icons';
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
import { RoutineTrainingStep } from '@/components/checkin/RoutineTrainingStep';
import { StepDots } from '@/components/checkin/StepDots';
import { SymptomCheckboxes } from '@/components/checkin/SymptomCheckboxes';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { YesNoField } from '@/components/checkin/YesNoField';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { firstIncompleteStep, getStepIssue, type CheckinStepIssue } from '@/lib/checkinCompleteness';
import {
  findPreviousCheckin,
  previousHintValues,
  type CheckinSliderHints,
  type HintedCheckinField,
} from '@/lib/checkinHints';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import {
  eveningCheckinSchema,
  morningCheckinSchema,
  type EveningCheckinFormData,
  type MorningCheckinFormData,
} from '@/lib/validations/checkin';
import type { CheckinType, FlareUp } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

export type CheckinFormData = MorningCheckinFormData | EveningCheckinFormData;

const TOTAL_STEPS = 3;

const STEP_ISSUE_MESSAGES: Record<CheckinStepIssue, string> = {
  answerPainQuestion: 'checkin.requiredPainQuestion',
  setPainLevel: 'checkin.requiredPainLevel',
  answerOneQuestion: 'checkin.requiredOneAnswer',
  answerSymptoms: 'checkin.requiredSymptoms',
};

// Editing an existing row means its pain question was already answered,
// even on old rows saved before `woke_up_with_pain` was asked — derive it
// from pain_level so editing those isn't blocked by the required-answer rule.
function seedFormDefaults(isMorning: boolean, defaultValues: CheckinFormData | undefined): CheckinFormData {
  if (!defaultValues) return isMorning ? morningDefaults : eveningDefaults;
  if (isMorning && (defaultValues as MorningCheckinFormData).woke_up_with_pain == null) {
    return { ...defaultValues, woke_up_with_pain: defaultValues.pain_level > 0 };
  }
  return defaultValues;
}

function hasNoSymptoms(values: CheckinFormData | undefined): boolean {
  if (!values) return false;
  const { tingling, numbness, headache, radiating_to, custom } = values.symptoms;
  return !tingling && !numbness && !headache && !radiating_to && (custom ?? []).length === 0 && values.triggers.length === 0;
}

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
  // The date this check-in is for (today, a backfilled date, or the edited
  // row's date) — used to find the previous check-in for "Yesterday: 6" hints.
  checkinDate: string;
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
  // Whether the user has any routine in rotation — evening only. When true, a
  // dedicated "did you train today?" step is inserted before step 1 (see
  // RoutineTrainingStep), same pre-step mechanism as flareUpCandidate.
  // Determined by the caller (checkin/[type].tsx via useRoutinesInRotation())
  // rather than by CheckinForm itself, matching how flareUpCandidate is
  // resolved by its caller too.
  hasRoutinesInRotation?: boolean;
}

function RequiredMessage({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
      <Text className="flex-1 text-sm text-red-600 dark:text-red-500">{text}</Text>
    </View>
  );
}

export function CheckinForm({
  type,
  checkinDate,
  defaultValues,
  submitLabel,
  onSubmit,
  onSaved,
  header,
  flareUpCandidate,
  hasRoutinesInRotation,
}: CheckinFormProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const isMorning = type === 'morning';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flareUpStepDone, setFlareUpStepDone] = useState(false);
  const [routineStepDone, setRoutineStepDone] = useState(false);
  // Pre-steps (flare-up follow-up, routine training) count as pages too.
  useStepHaptic(`${step}-${flareUpStepDone}-${routineStepDone}`);

  // Onboarding's "how much time per check-in" answer: 'quick' collapses the
  // Symptoms/Triggers step into an optional expandable section on step 2
  // instead of forcing a 3rd required step. 'detailed'/'varies'/unset behave
  // exactly as before (3 full steps).
  const isQuickMode = profile?.checkin_depth_preference === 'quick';

  // Display-only "Yesterday: 6" / "Last time: 6" under each slider, from the
  // previous same-type check-in within 30 days. Never pre-fills a value.
  const { checkins: recentCheckins } = useCheckinHistory(30);
  const previous = findPreviousCheckin(recentCheckins, type, checkinDate);
  const hints: CheckinSliderHints = {};
  if (previous) {
    const values = previousHintValues(previous.checkin);
    for (const field of Object.keys(values) as HintedCheckinField[]) {
      hints[field] = t(previous.isYesterday ? 'checkin.hintYesterday' : 'checkin.hintLastTime', {
        value: values[field] ?? '',
      });
    }
  }
  const totalSteps = isQuickMode ? 2 : TOTAL_STEPS;
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const { control, handleSubmit, setValue } = useForm<CheckinFormData>({
    resolver: zodResolver(isMorning ? morningCheckinSchema : eveningCheckinSchema),
    defaultValues: seedFormDefaults(isMorning, defaultValues),
  });
  const values = useWatch({ control }) as CheckinFormData;

  // Morning has a real persisted gate (`woke_up_with_pain`); evening has no DB
  // equivalent, so its gate is local UI state. Both are tri-state: null means
  // "not answered yet" and blocks Next — never treat it as No (that used to
  // save untouched check-ins as pain-free days). An existing row being edited
  // was answered, so evening seeds from pain_level > 0 there.
  const wokeUpWithPain = useWatch({
    control: control as Control<MorningCheckinFormData>,
    name: 'woke_up_with_pain',
  });
  const [eveningInPain, setEveningInPain] = useState<boolean | null>(() =>
    defaultValues ? defaultValues.pain_level > 0 : null,
  );
  const inPainAnswer: boolean | null = isMorning ? (wokeUpWithPain ?? null) : eveningInPain;
  const isInPain = inPainAnswer === true;

  // "No symptoms today" on the symptoms step — a real answer, unlike leaving it
  // blank. Pre-set when editing a row that was saved with no symptoms.
  const [noSymptomsConfirmed, setNoSymptomsConfirmed] = useState(() => hasNoSymptoms(defaultValues));
  // Which step the user tried to leave with a missing answer — the inline
  // message only shows after that attempt, and updates live as they answer.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);

  const completenessInput = { type, isQuickMode, values, inPain: inPainAnswer, noSymptomsConfirmed };
  const currentIssue = attemptedStep === step ? getStepIssue({ ...completenessInput, step }) : null;
  const issueMessage = currentIssue ? t(STEP_ISSUE_MESSAGES[currentIssue]) : undefined;

  const goToStep = (next: 1 | 2 | 3) => {
    setAttemptedStep(null);
    setStep(next);
  };

  const handleNext = () => {
    if (getStepIssue({ ...completenessInput, step })) {
      setAttemptedStep(step);
      haptics.error();
      return;
    }
    goToStep((step + 1) as 2 | 3);
  };

  const selectNoSymptoms = () => {
    if (noSymptomsConfirmed) return;
    haptics.tick();
    setNoSymptomsConfirmed(true);
    // Clears step-3 answers only — pain_areas belongs to step 1.
    setValue('symptoms', { pain_areas: values.symptoms.pain_areas ?? [] });
    setValue('triggers', []);
  };

  // Re-checks every step, not just the current one, so no path (e.g. a
  // future jump-to-step) can save an incomplete check-in.
  const handleSavePress = () => {
    const incomplete = firstIncompleteStep(completenessInput, totalSteps);
    if (incomplete !== null) {
      setStep(incomplete as 1 | 2 | 3);
      setAttemptedStep(incomplete);
      haptics.error();
      return;
    }
    handleSubmit(handleSave)();
  };

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

  if (hasRoutinesInRotation && !routineStepDone) {
    return (
      <View className="flex-1 bg-background dark:bg-backgroundDark">
        <Stack.Screen options={{ headerRight: () => <StepDots step={0} totalSteps={totalSteps} /> }} />
        <RoutineTrainingStep onDone={() => setRoutineStepDone(true)} />
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
        keyboardDismissMode="interactive"
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
                    error={currentIssue === 'answerPainQuestion' ? issueMessage : undefined}
                  />
                )}
              />
            ) : (
              <YesNoField
                label={t('checkin.inPainNow')}
                value={eveningInPain}
                onChange={setEveningInPain}
                info={t('checkin.inPainNowInfo')}
                error={currentIssue === 'answerPainQuestion' ? issueMessage : undefined}
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
                      hint={hints.pain_level}
                    />
                  )}
                />
                {currentIssue === 'setPainLevel' && <RequiredMessage text={issueMessage} />}

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
                  midLabel={t('checkin.somewhatStiff')}
                  maxLabel={t('checkin.rigid')}
                  restAtMidpoint
                  hint={hints.stiffness_level}
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
                  midLabel={t('checkin.somewhatLimited')}
                  maxLabel={t('checkin.full')}
                  restAtMidpoint
                  hint={hints.range_of_motion}
                  info={t('checkin.rangeOfMotionInfo')}
                />
              )}
            />
          </>
        )}

        {step === 2 && (
          <>
            {currentIssue === 'answerOneQuestion' && <RequiredMessage text={issueMessage} />}
            {isMorning ? (
              <MorningFields control={control as Control<MorningCheckinFormData>} hints={hints} />
            ) : (
              <EveningFields control={control as Control<EveningCheckinFormData>} hints={hints} />
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
            {currentIssue === 'answerSymptoms' && <RequiredMessage text={issueMessage} />}

            <Pressable
              onPress={selectNoSymptoms}
              accessibilityRole="button"
              accessibilityState={{ selected: noSymptomsConfirmed }}
              className={`flex-row items-center justify-center gap-2 self-start rounded-full px-4 py-2 ${
                noSymptomsConfirmed ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
              }`}
            >
              <Ionicons
                name={noSymptomsConfirmed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={noSymptomsConfirmed ? colors.white : colors.strongGray}
              />
              <Text
                className={`text-sm font-medium ${noSymptomsConfirmed ? 'text-white' : 'text-strongGray dark:text-white'}`}
              >
                {t('checkin.noSymptomsToday')}
              </Text>
            </Pressable>

            <Controller
              control={control}
              name="symptoms"
              render={({ field: { value, onChange } }) => (
                <SymptomCheckboxes
                  value={value}
                  onChange={(next) => {
                    setNoSymptomsConfirmed(false);
                    onChange(next);
                  }}
                />
              )}
            />

            {isInPain && (
              <Controller
                control={control}
                name="triggers"
                render={({ field: { value, onChange } }) => (
                  <TriggerChips
                    value={value}
                    onChange={(next) => {
                      setNoSymptomsConfirmed(false);
                      onChange(next);
                    }}
                  />
                )}
              />
            )}
          </>
        )}
      </ScrollView>

      <WizardFooter>
        {step > 1 && (
          <Pressable
            onPress={() => goToStep((step - 1) as 1 | 2)}
            className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
          </Pressable>
        )}

        {step < totalSteps ? (
          <Pressable
            onPress={handleNext}
            className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark"
          >
            <Text className="font-semibold text-white">{t('common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSavePress}
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
