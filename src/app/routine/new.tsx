import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { RoutinePhotosPicker } from '@/components/routine/RoutinePhotosPicker';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useGenerateRoutine, type GenerateRoutineInput } from '@/hooks/useGenerateRoutine';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { usePendingRoutineDraftStore } from '@/store/usePendingRoutineDraftStore';
import type { RoutinePhoto } from '@/utils/image';
import { toast } from '@/utils/toast';
import { PremiumScreen } from '@/components/premium/PremiumScreen';

type Source = 'physio_visit' | 'manual_input' | 'photos';

const SOURCE_LABEL_KEYS: Record<Source, string> = {
  manual_input: 'routine.sourceManual',
  physio_visit: 'routine.sourcePhysioVisit',
  photos: 'routine.sourcePhotos',
};

function NewRoutineScreenContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { assessments, isLoading: isLoadingAssessments } = usePhysioAssessments();
  const generateRoutine = useGenerateRoutine();
  const setDraft = usePendingRoutineDraftStore((s) => s.setDraft);

  const [source, setSource] = useState<Source>('manual_input');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  // Exercise-sheet photos: kept only in this screen's state, sent once.
  const [photos, setPhotos] = useState<RoutinePhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate =
    source === 'physio_visit'
      ? !!selectedVisitId
      : source === 'photos'
        ? photos.length > 0
        : inputText.trim().length > 0;

  const handleGenerate = async () => {
    const input: GenerateRoutineInput =
      source === 'physio_visit'
        ? { source: 'physio_visit', physio_visit_id: selectedVisitId! }
        : source === 'photos'
          ? { source: 'images', images: photos.map((photo) => photo.base64) }
          : { source: 'manual_input', input_text: inputText.trim() };

    setIsGenerating(true);
    // No carry-forward any more: exercises already in "My exercises" stay
    // there, and the import de-duplicates by name.
    const { draft, error } = await generateRoutine.mutateAsync(input);
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
    // form out of the back-stack. Nothing is saved yet at this point.
    router.replace('/routine/review' as Href);
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
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
                    className={`flex-1 items-center justify-center rounded-lg px-1 py-2.5 ${
                      isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
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
                        className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                          isActive
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
      </ScrollView>

      <WizardFooter>
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
