import { addMonths, addWeeks, format } from 'date-fns';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { PhysioQuestionsEditor } from '@/components/physioVisitWizard/PhysioQuestionsEditor';
import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { PhysioQuestionFormData } from '@/lib/validations/physioAssessment';

type NextVisitShortcut = 'week' | 'twoWeeks' | 'month' | 'custom';

function shortcutDate(shortcut: NextVisitShortcut): string {
  const today = new Date();
  switch (shortcut) {
    case 'week':
      return format(addWeeks(today, 1), 'yyyy-MM-dd');
    case 'twoWeeks':
      return format(addWeeks(today, 2), 'yyyy-MM-dd');
    case 'month':
      return format(addMonths(today, 1), 'yyyy-MM-dd');
    default:
      return todayLocalDate();
  }
}

export interface StepNextVisitProps {
  nextVisitDate: string | null;
  questions: PhysioQuestionFormData[];
  onChangeNextVisitDate: (value: string | null) => void;
  onChangeQuestions: (questions: PhysioQuestionFormData[]) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function StepNextVisit({
  nextVisitDate,
  questions,
  onChangeNextVisitDate,
  onChangeQuestions,
  onBack,
  onSave,
  isSaving,
}: StepNextVisitProps) {
  const { t } = useTranslation();

  const shortcuts: { key: NextVisitShortcut; labelKey: string }[] = [
    { key: 'week', labelKey: 'physioVisit.wizard.nextVisitInWeek' },
    { key: 'twoWeeks', labelKey: 'physioVisit.wizard.nextVisitInTwoWeeks' },
    { key: 'month', labelKey: 'physioVisit.wizard.nextVisitInMonth' },
    { key: 'custom', labelKey: 'physioVisit.wizard.nextVisitCustomDate' },
  ];

  const activeShortcut: NextVisitShortcut | null = nextVisitDate
    ? shortcuts.find((s) => s.key !== 'custom' && shortcutDate(s.key) === nextVisitDate)?.key ?? 'custom'
    : null;

  const handleShortcutPress = (shortcut: NextVisitShortcut) => {
    if (activeShortcut === shortcut) {
      onChangeNextVisitDate(null);
      return;
    }
    onChangeNextVisitDate(shortcutDate(shortcut));
  };

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text className="text-lg font-semibold text-black dark:text-white">
          {t('physioVisit.wizard.step3Title')}
        </Text>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-black dark:text-white">
            {t('physioVisit.wizard.nextVisitLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {shortcuts.map((shortcut) => {
              const isActive = activeShortcut === shortcut.key;
              return (
                <Pressable
                  key={shortcut.key}
                  onPress={() => handleShortcutPress(shortcut.key)}
                  className={`rounded-full px-3 py-1.5 ${isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                    }`}
                >
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                    {t(shortcut.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {activeShortcut === 'custom' && (
            <DatePickerField value={nextVisitDate} onChange={onChangeNextVisitDate} className="mt-2" />
          )}
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-black dark:text-white">
            {t('physioVisit.wizard.questionsDiscussedTitle')}
          </Text>
          <PhysioQuestionsEditor questions={questions} onChange={onChangeQuestions} />
        </View>
      </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onBack}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('physioVisit.wizard.backButton')}</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={isSaving}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('physioVisit.wizard.saveButton')}</Text>
          )}
        </Pressable>
      </WizardFooter>
    </View>
  );
}
