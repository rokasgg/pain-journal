import { Pressable, ScrollView, Text, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface Step1VisitInfoProps {
  visitDate: string;
  physioName: string | null;
  onChangeVisitDate: (date: string) => void;
  onChangePhysioName: (name: string) => void;
  onNext: () => void;
}

export function Step1VisitInfo({
  visitDate,
  physioName,
  onChangeVisitDate,
  onChangePhysioName,
  onNext,
}: Step1VisitInfoProps) {
  const { t } = useTranslation();
  const canContinue = visitDate.length > 0;

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
          {t('physioVisit.wizard.step1Title')}
        </Text>

        <DatePickerField
          label={t('physioVisit.visitDate')}
          value={visitDate}
          onChange={onChangeVisitDate}
          maximumDate={new Date()}
        />

        <Input
          label={t('physioVisit.physioName')}
          value={physioName ?? ''}
          onChangeText={onChangePhysioName}
        />
      </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onNext}
          disabled={!canContinue}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          <Text className="font-semibold text-white">{t('physioVisit.wizard.continueButton')}</Text>
        </Pressable>
      </WizardFooter>
    </View>
  );
}
