import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface StepVisitNotesProps {
  overallNotes: string | null;
  onChangeOverallNotes: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

// Its own step (rather than sharing a screen with other fields) because this
// is meant to hold a full description of the visit's training/exercises —
// potentially a lot of text — and needs room to actually read back what was
// typed, not just a cramped 3-line box competing with other inputs.
export function StepVisitNotes({ overallNotes, onChangeOverallNotes, onBack, onNext }: StepVisitNotesProps) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <View className="flex-1">
      <View className="flex-1 gap-6 px-6 py-6">
        <Text className="text-lg font-semibold text-black dark:text-white">
          {t('physioVisit.wizard.step2Title')}
        </Text>

        <Input
          label={t('physioVisit.overallNotes')}
          info={t('physioVisit.overallNotesInfo')}
          multiline
          textAlignVertical="top"
          value={overallNotes ?? ''}
          onChangeText={onChangeOverallNotes}
          style={{ height: screenHeight / 3 }}
        />
      </View>

      <WizardFooter>
        <Pressable
          onPress={onBack}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('physioVisit.wizard.backButton')}</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          className="flex-1 items-center rounded-lg bg-primary py-3 dark:bg-primaryDark"
        >
          <Text className="font-semibold text-white">{t('physioVisit.wizard.continueButton')}</Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}

