import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { EveningFields } from '@/components/checkin/EveningFields';
import { MorningFields } from '@/components/checkin/MorningFields';
import { PainAreaChips } from '@/components/checkin/PainAreaChips';
import { PainSlider } from '@/components/checkin/PainSlider';
import { SymptomCheckboxes } from '@/components/checkin/SymptomCheckboxes';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { YesNoField } from '@/components/checkin/YesNoField';
import { useTranslation } from '@/lib/i18n/useTranslation';
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
  exercise_hours: null,
  exercise_intensity: null,
};

export interface CheckinFormProps {
  type: CheckinType;
  defaultValues?: CheckinFormData;
  submitLabel: string;
  onSubmit: (data: CheckinFormData) => Promise<void>;
  header?: ReactNode;
}

export function CheckinForm({ type, defaultValues, submitLabel, onSubmit, header }: CheckinFormProps) {
  const { t } = useTranslation();
  const isMorning = type === 'morning';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<CheckinFormData>({
    resolver: zodResolver(isMorning ? morningCheckinSchema : eveningCheckinSchema),
    defaultValues: defaultValues ?? (isMorning ? morningDefaults : eveningDefaults),
  });

  // Morning has a real persisted gate (`woke_up_with_pain`); evening has no DB
  // equivalent, so its gate is local UI state derived from whether pain_level
  // was already > 0 (fully reconstructable — no schema/DB change needed).
  const wokeUpWithPain = useWatch({
    control: control as Control<MorningCheckinFormData>,
    name: 'woke_up_with_pain',
  });
  const [eveningInPain, setEveningInPain] = useState(() => (defaultValues?.pain_level ?? 0) > 0);
  const isInPain = isMorning ? !!wokeUpWithPain : eveningInPain;

  const handleSave = async (data: CheckinFormData) => {
    const finalData: CheckinFormData = isInPain
      ? data
      : { ...data, pain_level: 0, symptoms: { ...data.symptoms, pain_areas: [] } };

    setIsSubmitting(true);
    await onSubmit(finalData);
    setIsSubmitting(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-6"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {header}

      {isMorning ? (
        <Controller
          control={control as Control<MorningCheckinFormData>}
          name="woke_up_with_pain"
          render={({ field: { value, onChange } }) => (
            <YesNoField
              label={t('checkin.wokeUpWithPain')}
              value={value}
              onChange={onChange}
              info={t('checkin.wokeUpWithPainInfo')}
            />
          )}
        />
      ) : (
        <YesNoField
          label={t('checkin.inPainNow')}
          value={eveningInPain}
          onChange={setEveningInPain}
          info={t('checkin.inPainNowInfo')}
        />
      )}

      {isInPain && (
        <>
          <Controller
            control={control}
            name="pain_level"
            render={({ field: { value, onChange } }) => (
              <PainSlider
                label={t('checkin.painLevel')}
                value={value}
                onChange={onChange}
                info={t('checkin.painLevelInfo')}
              />
            )}
          />

          <Controller
            control={control}
            name="symptoms.pain_areas"
            render={({ field: { value, onChange } }) => (
              <PainAreaChips value={value ?? []} onChange={onChange} />
            )}
          />
        </>
      )}

      <Controller
        control={control}
        name="stiffness_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label={t('checkin.stiffness')}
            value={value}
            onChange={onChange}
            minLabel={t('checkin.flexible')}
            maxLabel={t('checkin.rigid')}
            info={t('checkin.stiffnessInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="range_of_motion"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label={t('checkin.rangeOfMotion')}
            value={value}
            onChange={onChange}
            minLabel={t('checkin.limited')}
            maxLabel={t('checkin.full')}
            info={t('checkin.rangeOfMotionInfo')}
          />
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
