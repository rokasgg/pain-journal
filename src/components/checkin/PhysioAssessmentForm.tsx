import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { MuscleFindingRow } from '@/components/checkin/MuscleFindingRow';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { physioAssessmentSchema, type PhysioAssessmentFormData } from '@/lib/validations/physioAssessment';

export interface PhysioAssessmentFormProps {
  defaultValues?: PhysioAssessmentFormData;
  submitLabel: string;
  onSubmit: (data: PhysioAssessmentFormData) => Promise<void>;
}

const emptyFinding: PhysioAssessmentFormData['findings'][number] = {
  muscle_name: '',
  status: 'weak',
  side: null,
  severity: null,
  notes: null,
};

const emptyDefaults: PhysioAssessmentFormData = {
  visit_date: todayLocalDate(),
  physio_name: null,
  overall_notes: null,
  findings: [emptyFinding],
};

export function PhysioAssessmentForm({
  defaultValues = emptyDefaults,
  submitLabel,
  onSubmit,
}: PhysioAssessmentFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { assessments } = usePhysioAssessments();

  const { control, handleSubmit } = useForm<PhysioAssessmentFormData>({
    resolver: zodResolver(physioAssessmentSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'findings' });

  // Assessments are already ordered by visit_date desc, so the first occurrence
  // of each muscle name (case-insensitive) is this user's most recent use of it.
  const recentMuscleNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const assessment of assessments) {
      for (const finding of assessment.muscle_findings ?? []) {
        const trimmed = finding.muscle_name.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !seen.has(key)) {
          seen.add(key);
          names.push(trimmed);
        }
      }
    }
    return names;
  }, [assessments]);

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
        name="overall_notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('physioVisit.overallNotes')}
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Text className="text-sm font-medium text-black dark:text-white">{t('physioVisit.muscleFindings')}</Text>

      {fields.map((field, index) => (
        <MuscleFindingRow
          key={field.id}
          control={control}
          index={index}
          onRemove={() => remove(index)}
          removable={fields.length > 1}
          recentMuscleNames={recentMuscleNames}
        />
      ))}

      <Pressable
        onPress={() => append(emptyFinding)}
        accessibilityRole="button"
        className="items-center rounded-lg border border-dashed border-gray-400 py-3 dark:border-gray-600"
      >
        <Text className="text-sm font-medium text-gray-500 dark:text-gray">{t('physioVisit.addMuscle')}</Text>
      </Pressable>

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
