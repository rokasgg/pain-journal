import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { PhysioQuestionsEditor } from '@/components/physioVisitWizard/PhysioQuestionsEditor';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { physioAssessmentSchema, type PhysioAssessmentFormData } from '@/lib/validations/physioAssessment';

export interface PhysioAssessmentFormProps {
  defaultValues?: PhysioAssessmentFormData;
  submitLabel: string;
  onSubmit: (data: PhysioAssessmentFormData) => Promise<void>;
}

const emptyDefaults: PhysioAssessmentFormData = {
  visit_date: todayLocalDate(),
  physio_name: null,
  overall_notes: null,
  next_visit_date: null,
  questions: [],
};

export function PhysioAssessmentForm({
  defaultValues = emptyDefaults,
  submitLabel,
  onSubmit,
}: PhysioAssessmentFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<PhysioAssessmentFormData>({
    resolver: zodResolver(physioAssessmentSchema),
    defaultValues,
  });

  const handleSave = async (data: PhysioAssessmentFormData) => {
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-6"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Controller
        control={control}
        name="visit_date"
        render={({ field: { value, onChange } }) => (
          <DatePickerField label={t('physioVisit.visitDate')} value={value} onChange={onChange} maximumDate={new Date()} />
        )}
      />

      <Controller
        control={control}
        name="physio_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('physioVisit.physioName')}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="next_visit_date"
        render={({ field: { value, onChange } }) => (
          <DatePickerField label={t('physioVisit.nextVisitDate')} value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="overall_notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('physioVisit.overallNotes')}
            info={t('physioVisit.overallNotesInfo')}
            multiline
            textAlignVertical="top"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            inputClassName="h-48"
          />
        )}
      />

      <Controller
        control={control}
        name="questions"
        render={({ field: { value, onChange } }) => (
          <>
            <Text className="text-sm font-medium text-black dark:text-white">
              {t('physioVisit.questionsForNextVisit')}
            </Text>
            <PhysioQuestionsEditor questions={value} onChange={onChange} />
          </>
        )}
      />

      <Pressable
        onPress={handleSubmit(handleSave)}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">{submitLabel}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
