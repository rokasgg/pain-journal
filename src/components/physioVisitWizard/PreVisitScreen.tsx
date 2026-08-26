import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { PhysioQuestionFormData } from '@/lib/validations/physioAssessment';
import type { PhysioQuestion } from '@/types/database.types';

function newQuestionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface PreVisitScreenProps {
  leftoverQuestions: PhysioQuestion[];
  suggestedQuestions: string[];
  onSkip: () => void;
  onContinue: (questions: PhysioQuestionFormData[]) => void;
}

export function PreVisitScreen({
  leftoverQuestions,
  suggestedQuestions,
  onSkip,
  onContinue,
}: PreVisitScreenProps) {
  const { t } = useTranslation();

  const [candidateLeftover, setCandidateLeftover] = useState(
    leftoverQuestions.map((q) => ({ ...q, checked: true })),
  );
  const [myQuestions, setMyQuestions] = useState<PhysioQuestionFormData[]>([]);

  const toggleLeftover = (id: string) => {
    setCandidateLeftover((prev) =>
      prev.map((q) => (q.id === id ? { ...q, checked: !q.checked } : q)),
    );
  };

  const removeLeftover = (id: string) => {
    setCandidateLeftover((prev) => prev.filter((q) => q.id !== id));
  };

  const addSuggested = (text: string) => {
    if (myQuestions.some((q) => q.text === text)) return;
    setMyQuestions((prev) => [
      ...prev,
      { id: newQuestionId(), text, discussed: false, answer: null, created_before_visit: true },
    ]);
  };

  const removeMyQuestion = (id: string) => {
    setMyQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleContinue = () => {
    const carriedOver: PhysioQuestionFormData[] = candidateLeftover
      .filter((q) => q.checked)
      .map((q) => ({
        id: newQuestionId(),
        text: q.text,
        discussed: false,
        answer: null,
        created_before_visit: true,
      }));
    onContinue([...carriedOver, ...myQuestions]);
  };

  return (
    <View className="flex-1">
    <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-lg font-semibold text-black dark:text-white">
        {t('physioVisit.wizard.preVisitTitle')}
      </Text>

      {candidateLeftover.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
            {t('physioVisit.wizard.preVisitFromLastVisit')}
          </Text>
          <View className="gap-2">
            {candidateLeftover.map((question) => (
              <View
                key={question.id}
                className="flex-row items-center gap-2 rounded-lg bg-surface px-3 py-2.5 dark:bg-surfaceDark"
              >
                <Pressable onPress={() => toggleLeftover(question.id)} hitSlop={8}>
                  <Ionicons
                    name={question.checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={question.checked ? colors.primary : colors.gray}
                  />
                </Pressable>
                <Text className="flex-1 text-sm text-black dark:text-white">{question.text}</Text>
                <Pressable onPress={() => removeLeftover(question.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.gray} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {suggestedQuestions.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
            {t('physioVisit.wizard.preVisitAiSuggested')}
          </Text>
          <View className="gap-2">
            {suggestedQuestions.map((question) => {
              const alreadyAdded = myQuestions.some((q) => q.text === question);
              return (
                <Pressable
                  key={question}
                  onPress={() => addSuggested(question)}
                  disabled={alreadyAdded}
                  className="flex-row items-center gap-2 rounded-lg bg-primaryMuted px-3 py-2.5 dark:bg-primaryMutedDark"
                >
                  <Ionicons
                    name={alreadyAdded ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text className="flex-1 text-sm text-black dark:text-white">{question}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {myQuestions.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
            {t('physioVisit.wizard.preVisitMyQuestions')}
          </Text>
          <View className="gap-2">
            {myQuestions.map((question) => (
              <View
                key={question.id}
                className="flex-row items-center justify-between rounded-lg bg-surface px-3 py-2.5 dark:bg-surfaceDark"
              >
                <Text className="flex-1 text-sm text-black dark:text-white">{question.text}</Text>
                <Pressable onPress={() => removeMyQuestion(question.id)} hitSlop={8}>
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
          onPress={onSkip}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('physioVisit.wizard.preVisitSkip')}</Text>
        </Pressable>
        <Pressable
          onPress={handleContinue}
          className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark"
        >
          <Text className="font-semibold text-white">{t('physioVisit.wizard.preVisitContinue')}</Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}
