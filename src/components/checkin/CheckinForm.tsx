import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckinSymptomsSection } from '@/components/checkin/CheckinSymptomsSection';
import { EveningFields } from '@/components/checkin/EveningFields';
import { FlareUpFollowUpStep } from '@/components/checkin/FlareUpFollowUpStep';
import { MorningFields } from '@/components/checkin/MorningFields';
import { RoutineTrainingStep } from '@/components/checkin/RoutineTrainingStep';
import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { StepSegments } from '@/components/checkin/StepSegments';
import { YesNoField } from '@/components/checkin/YesNoField';
import { SYMPTOM_OPTIONS } from '@/constants/symptoms';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useHealthSleep } from '@/hooks/useHealthSleep';
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
import { headerLeftWithoutGlass, headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { formatDuration, healthAsleepHours } from '@/lib/sleep';
import { colors } from '@/lib/theme';
import {
  eveningCheckinSchema,
  morningCheckinSchema,
  type EveningCheckinFormData,
  type MorningCheckinFormData,
} from '@/lib/validations/checkin';
import type { CheckinSymptoms, CheckinType, FlareUp } from '@/types/database.types';
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
  const { tingling, numbness, weakness, headache, dizziness, radiating_to, custom } = values.symptoms;
  return (
    !tingling &&
    !numbness &&
    !weakness &&
    !headache &&
    !dizziness &&
    !radiating_to &&
    (custom ?? []).length === 0 &&
    values.triggers.length === 0
  );
}

// Whether a symptoms edit changed the symptom answers themselves — as opposed
// to only the pain areas, which share the same object but must not clear a
// confirmed "no symptoms".
function symptomAnswersChanged(before: CheckinSymptoms, after: CheckinSymptoms): boolean {
  const flagsChanged = SYMPTOM_OPTIONS.some((option) => !!before[option.value] !== !!after[option.value]);
  return flagsChanged || (before.custom ?? []).join('\u0001') !== (after.custom ?? []).join('\u0001');
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
  sleep_positions: [],
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
  exercise_types: [],
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

// Big heading at the top of each step (design: "Kaip jaučiatės?").
const STEP_TITLE_KEYS: Record<CheckinType, [string, string, string]> = {
  morning: ['checkin.titleFeel', 'checkin.titleSleepMorning', 'checkin.titleSymptoms'],
  evening: ['checkin.titleFeel', 'checkin.titleDayEvening', 'checkin.titleSymptoms'],
};

// The check-in wizard (evening design: assets/possible-app-design/check in -
// evening; morning shares the pieces until its own mockups arrive). Three
// steps — how you feel, how the day/night went, symptoms — with a segmented
// progress bar and "1 iš 3" in the header, and one full-width button.
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
  const router = useRouter();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const isMorning = type === 'morning';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flareUpStepDone, setFlareUpStepDone] = useState(false);
  const [routineStepDone, setRoutineStepDone] = useState(false);
  // Pre-steps (flare-up follow-up, routine training) count as pages too.
  useStepHaptic(`${step}-${flareUpStepDone}-${routineStepDone}`);

  // Onboarding's "how much time per check-in" answer: 'quick' collapses the
  // Symptoms step into an optional expandable section on step 2 instead of
  // forcing a 3rd required step. 'detailed'/'varies'/unset behave exactly as
  // before (3 full steps).
  const isQuickMode = profile?.checkin_depth_preference === 'quick';

  // Display-only "Yesterday: 6" / "Last time: 6" on each slider card, plus a
  // ring on the track, from the previous same-type check-in within 30 days.
  // Never pre-fills a value.
  const { checkins: recentCheckins } = useCheckinHistory(30);
  const previous = findPreviousCheckin(recentCheckins, type, checkinDate);
  const previousValues = previous ? previousHintValues(previous.checkin) : {};
  const hints: CheckinSliderHints = {};
  if (previous) {
    for (const field of Object.keys(previousValues) as HintedCheckinField[]) {
      hints[field] = t(previous.isYesterday ? 'checkin.hintYesterday' : 'checkin.hintLastTime', {
        value: previousValues[field] ?? '',
      });
    }
  }
  // Apple Health's sleep for last night (morning, new check-ins only — an
  // edited entry keeps what was saved). It's shown on the sleep card, and
  // counts as the answer if the user doesn't change it: see healthHours below.
  const healthSleep = useHealthSleep();
  const health = isMorning && !defaultValues ? healthSleep : null;
  const healthHours = health ? healthAsleepHours(health) : null;
  const previousSleepHours = previous?.checkin.sleep_hours ?? null;
  const durationHint =
    previous && previousSleepHours !== null
      ? t(previous.isYesterday ? 'checkin.hintYesterday' : 'checkin.hintLastTime', {
          value: formatDuration(Math.round(previousSleepHours * 60), {
            hours: t('checkin.unitHours'),
            minutes: t('checkin.unitMinutes'),
          }),
        })
      : undefined;
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

  // "None" on the symptoms step — a real answer, unlike leaving it blank.
  // Pre-set when editing a row that was saved with no symptoms.
  const [noSymptomsConfirmed, setNoSymptomsConfirmed] = useState(() => hasNoSymptoms(defaultValues));
  // Which step the user tried to leave with a missing answer — the inline
  // message only shows after that attempt, and updates live as they answer.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);

  // Health's sleep stands in for an unanswered duration (and is saved below).
  const effectiveValues: CheckinFormData =
    healthHours !== null && (values as MorningCheckinFormData).sleep_hours == null ? ({ ...values, sleep_hours: healthHours } as CheckinFormData) : values;
  const completenessInput = { type, isQuickMode, values: effectiveValues, inPain: inPainAnswer, noSymptomsConfirmed };
  const currentIssue = attemptedStep === step ? getStepIssue({ ...completenessInput, step }) : null;
  const issueMessage = currentIssue ? t(STEP_ISSUE_MESSAGES[currentIssue]) : undefined;

  const goToStep = (next: 1 | 2 | 3) => {
    setAttemptedStep(null);
    setStep(next);
  };

  // Android's hardware back steps back one page, like the header chevron.
  useEffect(() => {
    if (step === 1) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setAttemptedStep(null);
      setStep((current) => (current > 1 ? ((current - 1) as 1 | 2) : current));
      return true;
    });
    return () => subscription.remove();
  }, [step]);

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
    // Clears the symptom answers only — pain areas are a separate answer.
    setValue('symptoms', { pain_areas: values.symptoms.pain_areas ?? [] });
    setValue('triggers', []);
  };

  const handleSymptomsChange = (next: CheckinSymptoms) => {
    if (symptomAnswersChanged(values.symptoms, next)) setNoSymptomsConfirmed(false);
    setValue('symptoms', next, { shouldDirty: true });
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
    const withHealth: CheckinFormData =
      healthHours !== null && (data as MorningCheckinFormData).sleep_hours == null
        ? ({ ...data, sleep_hours: healthHours } as CheckinFormData)
        : data;
    const finalData: CheckinFormData = isInPain
      ? withHealth
      : { ...withHealth, pain_level: 0, triggers: [], symptoms: { ...withHealth.symptoms, pain_areas: [] } };

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

  // "Rytinė registracija" / "Dienos registracija" in the header.
  const titleOptions = { title: t(isMorning ? 'checkin.morningTitle' : 'checkin.eveningTitle') };

  if (flareUpCandidate && !flareUpStepDone) {
    return (
      <View className="flex-1 bg-background dark:bg-backgroundDark">
        <Stack.Screen options={titleOptions} />
        <FlareUpFollowUpStep flareUp={flareUpCandidate} onDone={() => setFlareUpStepDone(true)} />
      </View>
    );
  }

  if (hasRoutinesInRotation && !routineStepDone) {
    return (
      <View className="flex-1 bg-background dark:bg-backgroundDark">
        <Stack.Screen options={titleOptions} />
        <StepSegments step={0} totalSteps={totalSteps} />
        <RoutineTrainingStep onDone={() => setRoutineStepDone(true)} />
      </View>
    );
  }

  // Header: "‹" steps back one page (and leaves the screen from step 1), and
  // the step counter sits on the right. The swipe-back gesture is off after
  // step 1 so it can't throw away a half-filled check-in by accident.
  const backElement = (
    <Pressable
      onPress={() => (step > 1 ? goToStep((step - 1) as 1 | 2) : router.back())}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      className="active:opacity-50"
    >
      <Ionicons name="chevron-back" size={26} color={colors.accent} />
    </Pressable>
  );
  const counterElement = (
    <Text className="mr-1 text-[17px] text-inkSecondary dark:text-gray">
      {t('checkin.stepOf', { step, total: totalSteps })}
    </Text>
  );

  const stepTitle = t(STEP_TITLE_KEYS[type][step - 1]);
  const previousActivity = (previousValues as Partial<Record<HintedCheckinField, number>>).activity_level ?? null;

  const symptomsSection = (
    <CheckinSymptomsSection
      symptoms={values.symptoms}
      onSymptomsChange={handleSymptomsChange}
      noSymptomsConfirmed={noSymptomsConfirmed}
      onSelectNoSymptoms={selectNoSymptoms}
      showAreas={isInPain}
      triggers={isMorning ? values.triggers : undefined}
      onTriggersChange={
        isMorning
          ? (next) => {
              setNoSymptomsConfirmed(false);
              setValue('triggers', next, { shouldDirty: true });
            }
          : undefined
      }
      notes={isMorning ? undefined : values.notes}
      onNotesChange={isMorning ? undefined : (next) => setValue('notes', next, { shouldDirty: true })}
      errorMessage={currentIssue === 'answerSymptoms' ? issueMessage : undefined}
    />
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-backgroundDark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          ...titleOptions,
          ...headerLeftWithoutGlass(backElement),
          ...headerRightWithoutGlass(counterElement),
          gestureEnabled: step === 1,
        }}
      />
      <StepSegments step={step} totalSteps={totalSteps} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {step === 1 && header}
        <Text className="text-2xl font-bold text-ink dark:text-white">{stepTitle}</Text>

        {step === 1 && (
          <>
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
              <View className="gap-2">
                <Controller
                  control={control}
                  name="pain_level"
                  render={({ field: { value, onChange } }) => (
                    <ScaleSliderCard
                      preset="pain"
                      title={t('checkin.painLevel')}
                      info={t('checkin.painLevelInfo')}
                      // 0 is "not set yet" here: "Yes, in pain" needs a level of 1+.
                      value={value >= 1 ? value : null}
                      onChange={onChange}
                      previous={previousValues.pain_level}
                      hint={hints.pain_level}
                    />
                  )}
                />
                {currentIssue === 'setPainLevel' && <RequiredMessage text={issueMessage} />}
              </View>
            )}

            <Controller
              control={control}
              name="stiffness_level"
              render={({ field: { value, onChange } }) => (
                <ScaleSliderCard
                  preset="stiffness"
                  title={t('checkin.stiffness')}
                  info={t('checkin.stiffnessInfo')}
                  value={value}
                  onChange={onChange}
                  previous={previousValues.stiffness_level}
                  hint={hints.stiffness_level}
                />
              )}
            />

            <Controller
              control={control}
              name="range_of_motion"
              render={({ field: { value, onChange } }) => (
                <ScaleSliderCard
                  preset="rangeOfMotion"
                  title={t('checkin.rangeOfMotion')}
                  info={t('checkin.rangeOfMotionInfo')}
                  value={value}
                  onChange={onChange}
                  previous={previousValues.range_of_motion}
                  hint={hints.range_of_motion}
                />
              )}
            />
          </>
        )}

        {step === 2 && (
          <>
            {currentIssue === 'answerOneQuestion' && <RequiredMessage text={issueMessage} />}
            {isMorning ? (
              <MorningFields
                control={control as Control<MorningCheckinFormData>}
                hints={hints}
                previousSleep={previousValues.sleep_quality ?? null}
                durationHint={durationHint}
                health={health}
              />
            ) : (
              <EveningFields
                control={control as Control<EveningCheckinFormData>}
                hints={hints}
                previousActivity={previousActivity}
              />
            )}

            {isQuickMode &&
              (!showMoreDetails ? (
                <Pressable
                  onPress={() => setShowMoreDetails(true)}
                  accessibilityRole="button"
                  className="items-center rounded-2xl border border-dashed border-gray py-3.5"
                >
                  <Text className="text-[15px] font-semibold text-inkSecondary dark:text-gray">
                    {t('checkin.addMoreDetails')}
                  </Text>
                </Pressable>
              ) : (
                symptomsSection
              ))}
          </>
        )}

        {!isQuickMode && step === 3 && symptomsSection}
      </ScrollView>

      <View
        className="border-t border-borderLight bg-background px-5 pt-3 dark:border-borderDark dark:bg-backgroundDark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={step < totalSteps ? handleNext : handleSavePress}
          disabled={isSubmitting}
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-2xl bg-accent dark:bg-primaryDark"
          style={{ opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-lg font-bold text-white">{step < totalSteps ? t('common.next') : submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
