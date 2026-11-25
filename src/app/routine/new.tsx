import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { StepDots } from '@/components/checkin/StepDots';
import { RoutinePhotosPicker } from '@/components/routine/RoutinePhotosPicker';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useGenerateRoutine, type GenerateRoutineInput } from '@/hooks/useGenerateRoutine';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { usePendingRoutineDraftStore } from '@/store/usePendingRoutineDraftStore';
import type { Routine } from '@/types/database.types';
import type { RoutinePhoto } from '@/utils/image';
import { toast } from '@/utils/toast';
import { PremiumScreen } from '@/components/premium/PremiumScreen';

type Source = 'physio_visit' | 'manual_input' | 'photos';

const SOURCE_LABEL_KEYS: Record<Source, string> = {
  manual_input: 'routine.sourceManual',
  physio_visit: 'routine.sourcePhysioVisit',
  photos: 'routine.sourcePhotos',
};

const TOTAL_STEPS = 2;

function NewRoutineScreenContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { assessments, isLoading: isLoadingAssessments } = usePhysioAssessments();
  const { routines: routinesInRotation } = useRoutinesInRotation();
  const generateRoutine = useGenerateRoutine();
  const setDraft = usePendingRoutineDraftStore((s) => s.setDraft);

  const [step, setStep] = useState<1 | 2>(1);
  useStepHaptic(step);
  const [source, setSource] = useState<Source>('manual_input');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  // Exercise-sheet photos: kept only in this screen's state, sent once.
  const [photos, setPhotos] = useState<RoutinePhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // With exactly one routine in rotation, carry forward from it directly
  // (unchanged from before multiple routines existed). With more than one
  // (e.g. alternating Day A / Day B), the user first picks which one to
  // carry exercises from — carryFromRoutineId stays null until they do.
  const [carryFromRoutineId, setCarryFromRoutineId] = useState<string | null>(null);
  const currentRoutine: Routine | null =
    routinesInRotation.length === 1
      ? routinesInRotation[0]
      : routinesInRotation.find((r) => r.id === carryFromRoutineId) ?? null;

  // Most exercises repeat between visits — default to keeping all of the
  // carry-from routine's exercises, user unchecks the ones that no longer
  // apply, rather than having to opt in to each one.
  const [carryForwardIds, setCarryForwardIds] = useState<Set<string>>(
    () => new Set(routinesInRotation.length === 1 ? routinesInRotation[0].exercises.map((exercise) => exercise.id) : []),
  );

  const toggleCarryForward = (id: string) => {
    setCarryForwardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCarryFromRoutine = (routine: Routine) => {
    setCarryFromRoutineId(routine.id);
    setCarryForwardIds(new Set(routine.exercises.map((exercise) => exercise.id)));
  };

  const canGenerate =
    source === 'physio_visit'
      ? !!selectedVisitId
      : source === 'photos'
        ? photos.length > 0
        : inputText.trim().length > 0;

  const handleGenerate = async () => {
    const carryForwardExercises = (currentRoutine?.exercises ?? []).filter((exercise) =>
      carryForwardIds.has(exercise.id),
    );

    const input: GenerateRoutineInput =
      source === 'physio_visit'
        ? { source: 'physio_visit', physio_visit_id: selectedVisitId! }
        : source === 'photos'
          ? { source: 'images', images: photos.map((photo) => photo.base64) }
          : { source: 'manual_input', input_text: inputText.trim() };

    setIsGenerating(true);
    const { draft, error } = await generateRoutine.mutateAsync({
      ...input,
      carry_forward_exercises: carryForwardExercises,
    });
    setIsGenerating(false);

    if (error || !draft) {
      toast.error(error ?? t('routine.generateFailed'));
      return;
    }

    setDraft({
      title: draft.title,
      exercises: draft.exercises,
      physioVisitId: source === 'physio_visit' ? selectedVisitId : null,
    });

    // Replace (not back) — lands on the editable review step, leaving this
    // form out of the back-stack so returning from there doesn't land on it
    // again. Nothing is saved to `routines` yet at this point.
    router.replace('/routine/review' as Href);
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <Stack.Screen options={headerRightWithoutGlass(<StepDots step={step} totalSteps={TOTAL_STEPS} />)} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        {step === 1 && (
          <>
            <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.carryForwardStepDescription')}</Text>

            {routinesInRotation.length > 1 && (
              <View className="gap-2">
                <Text className="text-sm font-medium text-strongGray dark:text-white">
                  {t('routine.carryForwardSourceLabel')}
                </Text>
                <View className="gap-2">
                  {routinesInRotation.map((option) => {
                    const isSelected = option.id === carryFromRoutineId;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => handleSelectCarryFromRoutine(option)}
                        className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${isSelected
                          ? 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
                          : 'border-gray-200 bg-surface dark:border-gray-800 dark:bg-surfaceDark'
                          }`}
                      >
                        <Text className="text-base text-black dark:text-white">{option.title}</Text>
                        {isSelected && <Text className="text-primary dark:text-primaryDark">✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {currentRoutine && currentRoutine.exercises.length > 0 ? (
              <View className="gap-2">
                <Text className="text-sm font-medium text-strongGray dark:text-white">
                  {t('routine.carryForwardLabel')}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray">{t('routine.carryForwardInfo')}</Text>

                <View className="gap-2">
                  {currentRoutine.exercises.map((exercise) => {
                    const checked = carryForwardIds.has(exercise.id);
                    return (
                      <Pressable
                        key={exercise.id}
                        onPress={() => toggleCarryForward(exercise.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        className="flex-row items-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-3 dark:border-gray-800 dark:bg-surfaceDark"
                      >
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={checked ? colors.primary : colors.gray}
                        />
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-black dark:text-white">{exercise.name}</Text>
                          <Text className="text-xs text-gray-500 dark:text-gray">
                            {exercise.muscle_group} · {exercise.target_sets_reps}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.noCurrentRoutineToCarryFrom')}</Text>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.newRoutineDescription')}</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-strongGray dark:text-white">{t('routine.sourceLabel')}</Text>
              <View className="flex-row gap-2">
                {(['manual_input', 'physio_visit', 'photos'] as const).map((option) => {
                  const isActive = source === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setSource(option)}
                      className={`flex-1 items-center justify-center rounded-lg px-1 py-2.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                        }`}
                    >
                      <Text
                        className={`text-center text-sm font-medium ${isActive ? 'text-white' : 'text-strongGray dark:text-white'}`}
                      >
                        {t(SOURCE_LABEL_KEYS[option])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {source === 'photos' ? (
              <RoutinePhotosPicker photos={photos} onChange={setPhotos} />
            ) : source === 'manual_input' ? (
              <Input
                label={t('routine.manualInputLabel')}
                placeholder={t('routine.manualInputPlaceholder')}
                multiline
                numberOfLines={5}
                value={inputText}
                onChangeText={setInputText}
                info={t('routine.manualInputInfo')}
              />
            ) : (
              <View className="gap-2">
                <Text className="text-sm font-medium text-strongGray dark:text-white">
                  {t('routine.selectVisitLabel')}
                </Text>

                {isLoadingAssessments ? (
                  <ActivityIndicator />
                ) : assessments.length === 0 ? (
                  <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.noVisitsYet')}</Text>
                ) : (
                  <View className="gap-2">
                    {assessments.map((assessment) => {
                      const isActive = selectedVisitId === assessment.id;
                      return (
                        <Pressable
                          key={assessment.id}
                          onPress={() => setSelectedVisitId(assessment.id)}
                          className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${isActive
                            ? 'border-primary bg-primaryMuted dark:border-primaryDark dark:bg-primaryMutedDark'
                            : 'border-gray-200 bg-surface dark:border-gray-800 dark:bg-surfaceDark'
                            }`}
                        >
                          <View>
                            <Text className="text-base text-black dark:text-white">
                              {formatCheckinDate(assessment.visit_date)}
                            </Text>
                            {assessment.physio_name && (
                              <Text className="text-xs text-gray-500 dark:text-gray">{assessment.physio_name}</Text>
                            )}
                          </View>
                          {isActive && <Text className="text-primary dark:text-primaryDark">✓</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <WizardFooter>
        {step > 1 && (
          <Pressable
            onPress={() => setStep(1)}
            className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-black dark:text-white">{t('common.back')}</Text>
          </Pressable>
        )}

        {step < TOTAL_STEPS ? (
          <Pressable
            onPress={() => setStep(2)}
            className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark"
          >
            <Text className="font-semibold text-white">{t('common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
          >
            {isGenerating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-semibold text-white">{t('routine.generateButton')}</Text>
            )}
          </Pressable>
        )}
      </WizardFooter>
    </View>
  );
}

// Premium-only (CLAUDE.md "Premium"): the content's hooks never run for free users.
export default function NewRoutineScreen() {
  return (
    <PremiumScreen feature="routines">
      <NewRoutineScreenContent />
    </PremiumScreen>
  );
}
