import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { PhysioQuestionFormData } from '@/lib/validations/physioAssessment';

export interface PhysioQuestionsEditorProps {
  questions: PhysioQuestionFormData[];
  onChange: (questions: PhysioQuestionFormData[]) => void;
}

function newQuestionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PhysioQuestionsEditor({ questions, onChange }: PhysioQuestionsEditorProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [visibleAnswerIds, setVisibleAnswerIds] = useState<Set<string>>(
    () => new Set(questions.filter((q) => q.answer).map((q) => q.id)),
  );

  const updateQuestion = (id: string, patch: Partial<PhysioQuestionFormData>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const handleAdd = () => {
    const trimmed = newQuestionText.trim();
    if (trimmed) {
      onChange([
        ...questions,
        { id: newQuestionId(), text: trimmed, discussed: false, answer: null, created_before_visit: false },
      ]);
    }
    setNewQuestionText('');
    setIsAdding(false);
  };

  return (
    <View className="gap-2">
      {questions.map((question) => {
        const showAnswerField = visibleAnswerIds.has(question.id);
        return (
          <View key={question.id} className="gap-2 rounded-lg bg-surface p-3 dark:bg-surfaceDark">
            <View className="flex-row items-start gap-2">
              <Pressable
                onPress={() => updateQuestion(question.id, { discussed: !question.discussed })}
                hitSlop={8}
              >
                <Ionicons
                  name={question.discussed ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={question.discussed ? colors.primary : colors.gray}
                />
              </Pressable>
              <Text
                className={`flex-1 text-sm ${question.discussed ? 'text-gray-500 line-through dark:text-gray' : 'text-black dark:text-white'
                  }`}
              >
                {question.text}
              </Text>
              <Pressable onPress={() => removeQuestion(question.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.gray} />
              </Pressable>
            </View>

            {showAnswerField ? (
              <Input
                placeholder={t('physioVisit.wizard.answerPlaceholder')}
                value={question.answer ?? ''}
                onChangeText={(value) => updateQuestion(question.id, { answer: value })}
                multiline
              />
            ) : (
              <Pressable
                onPress={() => setVisibleAnswerIds((prev) => new Set(prev).add(question.id))}
                className="flex-row items-center gap-1 self-start"
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text className="text-xs font-medium text-primary dark:text-primaryDark">
                  {t('physioVisit.wizard.addAnswer')}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {isAdding ? (
        <View className="flex-row items-center gap-2">
          <TextInput
            autoFocus
            value={newQuestionText}
            onChangeText={setNewQuestionText}
            onSubmitEditing={handleAdd}
            placeholder={t('physioVisit.wizard.newQuestionPlaceholder')}
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-black dark:border-gray-700 dark:bg-surfaceDark dark:text-white"
          />
          <Pressable onPress={handleAdd} className="rounded-lg bg-primary px-3 py-2 dark:bg-primaryDark">
            <Text className="text-sm font-semibold text-white">{t('common.add')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setIsAdding(true)} className="flex-row items-center gap-1.5 py-2">
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text className="text-sm font-medium text-primary dark:text-primaryDark">
            {t('physioVisit.wizard.addNewQuestion')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
