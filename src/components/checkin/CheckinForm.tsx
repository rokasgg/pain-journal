import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { EveningFields } from '@/components/checkin/EveningFields';
import { MorningFields } from '@/components/checkin/MorningFields';
import { PainSlider } from '@/components/checkin/PainSlider';
import { SymptomCheckboxes } from '@/components/checkin/SymptomCheckboxes';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { colors } from '@/lib/theme';
import {
  eveningCheckinSchema,
  morningCheckinSchema,
  type EveningCheckinFormData,
  type MorningCheckinFormData,
} from '@/lib/validations/checkin';
import type { CheckinType } from '@/types/database.types';

export type CheckinFormData = MorningCheckinFormData | EveningCheckinFormData;

export const morningDefaults: MorningCheckinFormData = {
  pain_level: 0,
  stiffness_level: null,
  range_of_motion: null,
  symptoms: {},
  triggers: [],
  notes: null,
  sleep_quality: null,
  sleep_hours: null,
  woke_up_with_pain: null,
  sleep_position: null,
};

export const eveningDefaults: EveningCheckinFormData = {
  pain_level: 0,
  stiffness_level: null,
  range_of_motion: null,
  symptoms: {},
  triggers: [],
  notes: null,
  activity_level: null,
  screen_time_hours: null,
  did_exercises: null,
  exercise_notes: null,
};

export interface CheckinFormProps {
  type: CheckinType;
  defaultValues?: CheckinFormData;
  submitLabel: string;
  onSubmit: (data: CheckinFormData) => Promise<void>;
  header?: ReactNode;
}

export function CheckinForm({ type, defaultValues, submitLabel, onSubmit, header }: CheckinFormProps) {
  const isMorning = type === 'morning';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<CheckinFormData>({
    resolver: zodResolver(isMorning ? morningCheckinSchema : eveningCheckinSchema),
    defaultValues: defaultValues ?? (isMorning ? morningDefaults : eveningDefaults),
  });

  const handleSave = async (data: CheckinFormData) => {
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-6 px-6 py-6">
      {header}

      <Controller
        control={control}
        name="pain_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider label="Pain level" value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="stiffness_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider label="Stiffness" value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="range_of_motion"
        render={({ field: { value, onChange } }) => (
          <PainSlider label="Range of motion" value={value} onChange={onChange} />
        )}
      />

      {isMorning ? (
        <MorningFields control={control as Control<MorningCheckinFormData>} />
      ) : (
        <EveningFields control={control as Control<EveningCheckinFormData>} />
      )}

      <Controller
        control={control}
        name="symptoms"
        render={({ field: { value, onChange } }) => (
          <SymptomCheckboxes value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="triggers"
        render={({ field: { value, onChange } }) => <TriggerChips value={value} onChange={onChange} />}
      />

      <Pressable
        onPress={handleSubmit(handleSave)}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-black py-3 disabled:opacity-50 dark:bg-white"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white dark:text-black">{submitLabel}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
