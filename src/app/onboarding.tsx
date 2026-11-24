import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MultiSelectChips } from '@/components/onboarding/MultiSelectChips';
import { OnboardingIntro } from '@/components/onboarding/OnboardingIntro';
import { PainLocationsField } from '@/components/onboarding/PainLocationsField';
import { SingleSelectList } from '@/components/onboarding/SingleSelectList';
import { StartingPictureCards } from '@/components/onboarding/StartingPictureCards';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { WizardProgress } from '@/components/physioVisitWizard/WizardProgress';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import {
  CHECKIN_DEPTH_OPTIONS,
  DIAGNOSED_BY_OPTIONS,
  DIAGNOSIS_STATUS_OPTIONS,
  EXERCISE_FREQUENCY_OPTIONS,
  INJURY_ONSET_PERIOD_OPTIONS,
  LIFE_STRESS_OPTIONS,
  ONBOARDING_TOTAL_STEPS,
  PAIN_CHARACTER_OPTIONS,
  PURPOSE_OPTIONS,
  SUSPECTED_TRIGGER_OPTIONS,
  WORK_HOURS_OPTIONS,
  WORK_TYPE_OPTIONS,
  WORST_TIME_OF_DAY_OPTIONS,
} from '@/constants/onboarding';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  approxStartDate,
  onboardingSteps,
  purposeOf,
  SKIPPABLE_STEPS,
  wantsRecovery,
  type OnboardingStepKey,
} from '@/lib/profileAnswers';
import { buildStartingPicture } from '@/lib/startingPicture';
import { colors } from '@/lib/theme';
import { useOnboardingCompleteStore } from '@/store/useOnboardingCompleteStore';
import type {
  CheckinDepthPreference,
  DiagnosedBy,
  DiagnosisStatus,
  ExerciseFrequency,
  InjuryOnsetPeriod,
  LifeStress,
  PrimaryGoal,
  ProfileUpdate,
  WorkHours,
  WorkType,
  WorstTimeOfDay,
} from '@/types/database.types';
import { toast } from '@/utils/toast';

const TEXT_MAX_LENGTH = 500;
const DIAGNOSIS_STATUS_OPTIONS_NOT_YET_FIRST = [
  ...DIAGNOSIS_STATUS_OPTIONS.filter((o) => o.value === 'not_yet'),
  ...DIAGNOSIS_STATUS_OPTIONS.filter((o) => o.value !== 'not_yet'),
];

interface OnboardingAnswers {
  primaryGoal: PrimaryGoal | null;
  painLocations: string[];
  painCharacter: string[];
  startDate: string | null;
  startPeriod: InjuryOnsetPeriod | null;
  whatHappened: string;
  healingStartedOn: string | null;
  diagnosisStatus: DiagnosisStatus | null;
  diagnosisText: string;
  diagnosedBy: DiagnosedBy | null;
  diagnosedOn: string | null;
  diagnosisNotes: string;
  workType: WorkType | null;
  workHours: WorkHours | null;
  lifeStress: LifeStress | null;
  exerciseFrequency: ExerciseFrequency | null;
  suspectedTriggers: string[];
  worstTimeOfDay: WorstTimeOfDay | null;
  checkinDepthPreference: CheckinDepthPreference | null;
  physioExercises: 'yes' | 'no' | null;
  aiInsightsEnabled: boolean | null;
}

const initialAnswers: OnboardingAnswers = {
  primaryGoal: null,
  painLocations: [],
  painCharacter: [],
  startDate: null,
  startPeriod: null,
  whatHappened: '',
  healingStartedOn: null,
  diagnosisStatus: null,
  diagnosisText: '',
  diagnosedBy: null,
  diagnosedOn: null,
  diagnosisNotes: '',
  workType: null,
  workHours: null,
  lifeStress: null,
  exerciseFrequency: null,
  suspectedTriggers: [],
  worstTimeOfDay: null,
  checkinDepthPreference: null,
  physioExercises: null,
  aiInsightsEnabled: null,
};

const needsWorkHours = (workType: WorkType | null) => workType === 'sitting' || workType === 'standing';
const trimmedOrNull = (text: string) => text.trim() || null;

// Can the user press Next on this step? The lifestyle steps need an answer for
// Next, but always offer "Ask me later" instead (SKIPPABLE_STEPS).
function canContinue(step: OnboardingStepKey, answers: OnboardingAnswers): boolean {
  switch (step) {
    case 'purpose':
      return answers.primaryGoal !== null;
    case 'where':
      return true;
    case 'start':
      return !!answers.startDate || !!answers.startPeriod;
    case 'diagnosis':
      return answers.diagnosisStatus === 'yes'
        ? answers.diagnosisText.trim().length > 0
        : answers.diagnosisStatus !== null;
    case 'work':
      return answers.workType !== null && (!needsWorkHours(answers.workType) || answers.workHours !== null);
    case 'stress':
      return answers.lifeStress !== null && answers.exerciseFrequency !== null;
    case 'hunches':
      return answers.suspectedTriggers.length > 0 || answers.worstTimeOfDay !== null;
    case 'prefs':
      return answers.checkinDepthPreference !== null && answers.physioExercises !== null;
    case 'ai':
      return answers.aiInsightsEnabled !== null;
  }
}

// "Ask me later" clears what was half-answered on that step, so a skipped
// step saves nothing.
function clearStep(step: OnboardingStepKey, answers: OnboardingAnswers): OnboardingAnswers {
  switch (step) {
    case 'work':
      return { ...answers, workType: null, workHours: null };
    case 'stress':
      return { ...answers, lifeStress: null, exerciseFrequency: null };
    case 'hunches':
      return { ...answers, suspectedTriggers: [], worstTimeOfDay: null };
    default:
      return answers;
  }
}

function buildProfileUpdate(answers: OnboardingAnswers): ProfileUpdate {
  const today = todayLocalDate();
  const approxDate = answers.startPeriod ? approxStartDate(answers.startPeriod, today) : null;
  const injuryStartedOn = answers.startDate ?? approxDate;
  const diagnosed = answers.diagnosisStatus === 'yes';
  const recovery = wantsRecovery(purposeOf(answers.primaryGoal));
  // A recovery start before the injury date can't be right; start it then.
  const healingStartedOn =
    recovery && answers.healingStartedOn
      ? injuryStartedOn && answers.healingStartedOn < injuryStartedOn
        ? injuryStartedOn
        : answers.healingStartedOn
      : null;

  return {
    onboarding_completed: true,
    primary_goal: answers.primaryGoal,
    pain_locations: answers.painLocations,
    pain_character: answers.painCharacter,
    injury_started_on: injuryStartedOn,
    injury_started_approx: !answers.startDate && approxDate !== null,
    injury_description: trimmedOrNull(answers.whatHappened),
    ...(healingStartedOn ? { healing_started_on: healingStartedOn } : {}),
    diagnosis_status: answers.diagnosisStatus,
    diagnosis_text: diagnosed ? trimmedOrNull(answers.diagnosisText) : null,
    diagnosed_by: diagnosed ? answers.diagnosedBy : null,
    diagnosed_on: diagnosed ? answers.diagnosedOn : null,
    diagnosis_notes: diagnosed ? trimmedOrNull(answers.diagnosisNotes) : null,
    // A professional's diagnosis already answers the Home care step ("Do you
    // know what's causing your pain?"), so it isn't asked a week later.
    ...(diagnosed
      ? { care_status: 'with_professional' as const, care_status_answered_at: new Date().toISOString() }
      : {}),
    work_type: answers.workType,
    work_hours: needsWorkHours(answers.workType) ? answers.workHours : null,
    life_stress: answers.lifeStress,
    exercise_frequency: answers.exerciseFrequency,
    suspected_triggers: answers.suspectedTriggers,
    worst_time_of_day: answers.worstTimeOfDay,
    checkin_depth_preference: answers.checkinDepthPreference,
    // "Are you doing exercises from a physio?" is the training switch.
    training_enabled: answers.physioExercises === 'yes',
    ai_insights_enabled: answers.aiInsightsEnabled ?? true,
  };
}

function StepTitle({ children }: { children: ReactNode }) {
  return <Text className="text-2xl font-bold text-black dark:text-white">{children}</Text>;
}

function Question({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View className="gap-1">
      <Text className="text-base font-medium text-black dark:text-white">{children}</Text>
      {hint && <Text className="text-sm text-inkSecondary dark:text-gray">{hint}</Text>}
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const updateProfile = useUpdateProfile();
  const { user } = useSession();
  // Welcome screen before question 1 — local only (leaving mid-way already
  // loses progress by design, so reopening shows the intro again).
  const [hasStarted, setHasStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);
  const [isSaving, setIsSaving] = useState(false);
  // "Your starting picture", shown after the last question; saving happens there.
  const [showPicture, setShowPicture] = useState(false);

  const purpose = purposeOf(answers.primaryGoal);
  const steps = onboardingSteps(purpose);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  useStepHaptic(step);

  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goBack = () => (stepIndex === 0 ? setHasStarted(false) : setStepIndex((i) => i - 1));
  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const askLater = () => {
    setAnswers((prev) => clearStep(step, prev));
    goNext();
  };

  const handleFinish = async () => {
    setIsSaving(true);
    // Queue Home's success checkmark before saving; cleared again on error.
    useOnboardingCompleteStore.getState().markPending();
    const { error } = await updateProfile.mutateAsync(buildProfileUpdate(answers));
    if (error) {
      setIsSaving(false);
      useOnboardingCompleteStore.getState().consume();
      toast.error(error);
      return;
    }

    // No navigation here: the root layout's guard redirects to (tabs) as soon
    // as the refetched profile has onboarding_completed — it's the single
    // source of truth for auth/onboarding redirects. Navigating here as well
    // used to fire two overlapping fade transitions. isSaving deliberately
    // stays true so the button keeps its spinner until the screen leaves.
  };

  if (!hasStarted) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
        <OnboardingIntro name={user?.user_metadata?.name as string | undefined} onStart={() => setHasStarted(true)} />
      </SafeAreaView>
    );
  }

  if (showPicture) {
    const cards = buildStartingPicture({
      purpose,
      workType: answers.workType,
      workHours: answers.workHours,
      lifeStress: answers.lifeStress,
      suspectedTriggers: answers.suspectedTriggers,
      worstTimeOfDay: answers.worstTimeOfDay,
    });
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
        <Animated.View entering={FadeIn.duration(300)} className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-8">
            <View className="gap-2">
              <StepTitle>{t('startingPicture.title')}</StepTitle>
              <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">
                {t('startingPicture.subtitle')}
              </Text>
            </View>
            <StartingPictureCards cards={cards} />
          </ScrollView>
          <WizardFooter>
            <Pressable
              onPress={() => setShowPicture(false)}
              disabled={isSaving}
              className="flex-1 items-center rounded-lg border border-borderLight py-3 dark:border-borderDark"
            >
              <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
            </Pressable>
            <Pressable
              onPress={handleFinish}
              disabled={isSaving}
              className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="font-semibold text-white">{t('startingPicture.start')}</Text>
              )}
            </Pressable>
          </WizardFooter>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const recovery = wantsRecovery(purpose);
  const canGoNext = canContinue(step, answers);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} className="flex-1">
        <WizardProgress step={stepIndex + 1} totalSteps={ONBOARDING_TOTAL_STEPS} />

        <ScrollView
          {...keepFocusedVisible}
          className="flex-1"
          contentContainerClassName="gap-6 px-6 py-6"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
        >
          {step === 'purpose' && (
            <View className="gap-3">
              <StepTitle>{t('onboarding.purposeQuestion')}</StepTitle>
              <Text className="text-sm text-inkSecondary dark:text-gray">{t('onboarding.purposeHint')}</Text>
              <SingleSelectList
                options={PURPOSE_OPTIONS}
                value={answers.primaryGoal}
                onChange={(v) => set('primaryGoal', v)}
              />
            </View>
          )}

          {step === 'where' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.locationsQuestion')}</StepTitle>
                <PainLocationsField value={answers.painLocations} onChange={(v) => set('painLocations', v)} />
              </View>
              <View className="gap-3">
                <Question>{t('onboarding.characterQuestion')}</Question>
                <MultiSelectChips
                  options={PAIN_CHARACTER_OPTIONS}
                  value={answers.painCharacter}
                  onChange={(v) => set('painCharacter', v)}
                  otherLabelKey="onboarding.characterOther"
                />
              </View>
            </>
          )}

          {step === 'start' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.onsetQuestion')}</StepTitle>
                <DatePickerField
                  value={answers.startDate}
                  onChange={(date) => {
                    set('startDate', date);
                    set('startPeriod', null);
                  }}
                  maximumDate={new Date()}
                />
                <Text className="text-xs text-inkSecondary dark:text-gray">{t('onboarding.onsetOrApprox')}</Text>
                <SingleSelectList
                  options={INJURY_ONSET_PERIOD_OPTIONS}
                  value={answers.startPeriod}
                  onChange={(value) => {
                    set('startPeriod', value);
                    set('startDate', null);
                  }}
                />
              </View>
              {recovery && (
                <View className="gap-3">
                  <Question hint={t('onboarding.recoveryStartHint')}>{t('onboarding.recoveryStartQuestion')}</Question>
                  <DatePickerField
                    value={answers.healingStartedOn}
                    onChange={(date) => set('healingStartedOn', date)}
                    maximumDate={new Date()}
                  />
                </View>
              )}
              <Input
                label={t('onboarding.whatHappenedLabel')}
                placeholder={t('onboarding.whatHappenedPlaceholder')}
                value={answers.whatHappened}
                onChangeText={(text) => set('whatHappened', text)}
                maxLength={TEXT_MAX_LENGTH}
                multiline
                inputClassName="h-24"
              />
            </>
          )}

          {step === 'diagnosis' && (
            <>
              <View className="gap-3">
                <StepTitle>
                  {t(recovery ? 'onboarding.diagnosisQuestion' : 'onboarding.diagnosisQuestionLight')}
                </StepTitle>
                <Text className="text-sm text-inkSecondary dark:text-gray">{t('onboarding.diagnosisHint')}</Text>
                <SingleSelectList
                  // "Not yet" first when the user is here to understand their pain.
                  options={recovery ? DIAGNOSIS_STATUS_OPTIONS : DIAGNOSIS_STATUS_OPTIONS_NOT_YET_FIRST}
                  value={answers.diagnosisStatus}
                  onChange={(v) => set('diagnosisStatus', v)}
                />
              </View>
              {answers.diagnosisStatus === 'yes' && (
                <>
                  <Input
                    label={t('onboarding.diagnosisTextLabel')}
                    placeholder={t('onboarding.diagnosisTextPlaceholder')}
                    value={answers.diagnosisText}
                    onChangeText={(text) => set('diagnosisText', text)}
                    maxLength={200}
                  />
                  <Text className="-mt-3 text-xs text-inkSecondary dark:text-gray">
                    {t('onboarding.diagnosisTextHint')}
                  </Text>
                  <View className="gap-3">
                    <Question>{t('onboarding.diagnosedByQuestion')}</Question>
                    <MultiSelectChips
                      options={DIAGNOSED_BY_OPTIONS}
                      value={answers.diagnosedBy ? [answers.diagnosedBy] : []}
                      // Single choice: the last tapped chip wins.
                      onChange={(v) => set('diagnosedBy', (v.at(-1) as DiagnosedBy | undefined) ?? null)}
                    />
                  </View>
                  <View className="gap-3">
                    <Question>{t('onboarding.diagnosedOnQuestion')}</Question>
                    <DatePickerField
                      value={answers.diagnosedOn}
                      onChange={(date) => set('diagnosedOn', date)}
                      maximumDate={new Date()}
                    />
                  </View>
                  <Input
                    label={t('onboarding.diagnosisNotesLabel')}
                    placeholder={t('onboarding.diagnosisNotesPlaceholder')}
                    value={answers.diagnosisNotes}
                    onChangeText={(text) => set('diagnosisNotes', text)}
                    maxLength={TEXT_MAX_LENGTH}
                    multiline
                    inputClassName="h-24"
                  />
                </>
              )}
            </>
          )}

          {step === 'work' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.workQuestion')}</StepTitle>
                <SingleSelectList
                  options={WORK_TYPE_OPTIONS}
                  value={answers.workType}
                  onChange={(v) => set('workType', v)}
                />
              </View>
              {needsWorkHours(answers.workType) && (
                <View className="gap-3">
                  <Question>
                    {t(answers.workType === 'sitting' ? 'onboarding.hoursSitting' : 'onboarding.hoursStanding')}
                  </Question>
                  <SingleSelectList
                    options={WORK_HOURS_OPTIONS}
                    value={answers.workHours}
                    onChange={(v) => set('workHours', v)}
                  />
                </View>
              )}
            </>
          )}

          {step === 'stress' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.lifeStressQuestion')}</StepTitle>
                <SingleSelectList
                  options={LIFE_STRESS_OPTIONS}
                  value={answers.lifeStress}
                  onChange={(v) => set('lifeStress', v)}
                />
              </View>
              <View className="gap-3">
                <Question>{t('onboarding.exerciseQuestion')}</Question>
                <SingleSelectList
                  options={EXERCISE_FREQUENCY_OPTIONS}
                  value={answers.exerciseFrequency}
                  onChange={(v) => set('exerciseFrequency', v)}
                />
              </View>
            </>
          )}

          {step === 'hunches' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.hunchesQuestion')}</StepTitle>
                <Text className="text-sm text-inkSecondary dark:text-gray">{t('onboarding.hunchesHint')}</Text>
                <MultiSelectChips
                  options={SUSPECTED_TRIGGER_OPTIONS}
                  value={answers.suspectedTriggers}
                  onChange={(v) =>
                    // "I don't know" and the real hunches exclude each other.
                    set(
                      'suspectedTriggers',
                      v.at(-1) === 'dont_know' ? ['dont_know'] : v.filter((value) => value !== 'dont_know'),
                    )
                  }
                />
              </View>
              <View className="gap-3">
                <Question>{t('onboarding.worstTimeQuestion')}</Question>
                <SingleSelectList
                  options={WORST_TIME_OF_DAY_OPTIONS}
                  value={answers.worstTimeOfDay}
                  onChange={(v) => set('worstTimeOfDay', v)}
                />
              </View>
            </>
          )}

          {step === 'prefs' && (
            <>
              <View className="gap-3">
                <StepTitle>{t('onboarding.depthQuestion')}</StepTitle>
                <SingleSelectList
                  options={CHECKIN_DEPTH_OPTIONS}
                  value={answers.checkinDepthPreference}
                  onChange={(v) => set('checkinDepthPreference', v)}
                />
              </View>
              <View className="gap-3">
                <Question hint={t('onboarding.physioExercisesHint')}>
                  {t('onboarding.physioExercisesQuestion')}
                </Question>
                <SingleSelectList
                  options={[
                    { value: 'yes', labelKey: 'common.yes' },
                    { value: 'no', labelKey: 'common.no' },
                  ]}
                  value={answers.physioExercises}
                  onChange={(v) => set('physioExercises', v)}
                />
              </View>
            </>
          )}

          {step === 'ai' && (
            <View className="gap-3">
              <StepTitle>{t('onboarding.step4Title')}</StepTitle>
              <Text className="text-base font-medium text-black dark:text-white">{t('onboarding.aiQuestion')}</Text>
              <Text className="text-sm text-inkSecondary dark:text-gray">{t('onboarding.aiExplanation')}</Text>
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

          {SKIPPABLE_STEPS.has(step) && (
            <Pressable accessibilityRole="button" onPress={askLater} className="items-center py-2 active:opacity-60">
              <Text className="text-[15px] font-semibold text-accent">{t('onboarding.askLater')}</Text>
            </Pressable>
          )}
        </ScrollView>

        <WizardFooter>
          {/* Back on question 1 returns to the welcome intro. */}
          <Pressable
            onPress={goBack}
            className="flex-1 items-center rounded-lg border border-borderLight py-3 dark:border-borderDark"
          >
            <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
          </Pressable>

          {!isLast ? (
            <Pressable
              onPress={goNext}
              disabled={!canGoNext}
              className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
            >
              <Text className="font-semibold text-white">{t('common.next')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setShowPicture(true)}
              disabled={!canGoNext}
              className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
            >
              <Text className="font-semibold text-white">{t('onboarding.finish')}</Text>
            </Pressable>
          )}
        </WizardFooter>
      </Animated.View>
    </SafeAreaView>
  );
}
