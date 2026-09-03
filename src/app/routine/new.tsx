import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useGenerateRoutine, type GenerateRoutineInput } from '@/hooks/useGenerateRoutine';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

type Source = 'physio_visit' | 'manual_input';

export default function NewRoutineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { assessments, isLoading: isLoadingAssessments } = usePhysioAssessments();
  const generateRoutine = useGenerateRoutine();

  const [source, setSource] = useState<Source>('manual_input');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate =
    source === 'physio_visit' ? !!selectedVisitId : inputText.trim().length > 0;

  const handleGenerate = async () => {
    const input: GenerateRoutineInput =
      source === 'physio_visit'
        ? { source: 'physio_visit', physio_visit_id: selectedVisitId! }
        : { source: 'manual_input', input_text: inputText.trim() };

    setIsGenerating(true);
    const { error } = await generateRoutine.mutateAsync(input);
    setIsGenerating(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('routine.generatedToast'));
    // Replace (not back) — lands on a read-only view of exactly what was
    // generated, acting as the "confirmation" step, and leaves this form out
    // of the back-stack so returning from there doesn't land on it again.
    router.replace('/routine/view' as Href);
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text className="text-sm text-gray-500 dark:text-gray">{t('routine.newRoutineDescription')}</Text>

        <View className="gap-2">
          <Text className="text-sm font-medium text-strongGray dark:text-white">{t('routine.sourceLabel')}</Text>
          <View className="flex-row gap-2">
            {(['manual_input', 'physio_visit'] as const).map((option) => {
              const isActive = source === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSource(option)}
                  className={`flex-1 items-center rounded-lg py-2.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                    }`}
                >
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-strongGray dark:text-white'}`}>
                    {t(option === 'manual_input' ? 'routine.sourceManual' : 'routine.sourcePhysioVisit')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {source === 'manual_input' ? (
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
      </ScrollView>

      <View className="px-6 pb-12">
        <Pressable
          onPress={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isGenerating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('routine.generateButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
