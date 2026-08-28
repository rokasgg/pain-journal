import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { Input } from '@/components/ui/Input';
import { FLARE_UP_STATUS_OPTIONS } from '@/constants/flareUp';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { flareUpSchema, type FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export interface FlareUpFormProps {
  defaultValues?: FlareUpFormData;
  submitLabel: string;
  // Performs the actual save and reports the outcome instead of navigating
  // itself: `{ error }` on success or failure, or `undefined` when the save
  // was intentionally short-circuited — same contract as CheckinForm.
  onSubmit: (data: FlareUpFormData) => Promise<{ error: string | null } | undefined>;
  // Called right after a successful save — do the toast + navigation here,
  // not in onSubmit, so a short-circuited/failed save never navigates. The
  // success toast itself (toast.success, via ToastModalHost) is what plays
  // the checkmark animation now, not this form's submit button.
  onSaved?: () => void;
}

const emptyDefaults: FlareUpFormData = {
  occurred_at: new Date().toISOString(),
  pain_level: 5,
  likely_cause: null,
  description: null,
  status: 'resolved',
};

export function FlareUpForm({ defaultValues = emptyDefaults, submitLabel, onSubmit, onSaved }: FlareUpFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<FlareUpFormData>({
    resolver: zodResolver(flareUpSchema),
    defaultValues,
  });

  const handleSave = async (data: FlareUpFormData) => {
    setIsSubmitting(true);
    const result = await onSubmit(data);

    if (!result) {
      // Save was intentionally short-circuited — just reset, no error/success UI.
      setIsSubmitting(false);
      return;
    }

    if (result.error) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    // No success animation on the button itself — the toast shown by onSaved
    // (via toast.success) already plays the checkmark, ToastModalHost.tsx.
    setIsSubmitting(false);
    onSaved?.();
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
        name="occurred_at"
        render={({ field: { value, onChange } }) => (
          <DateTimePickerField
            label={t('flareUp.occurredAt')}
            value={value}
            onChange={onChange}
            maximumDate={new Date()}
          />
        )}
      />

      <Controller
        control={control}
        name="pain_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label={t('checkin.painLevel')}
            value={value}
            onChange={onChange}
            info={t('checkin.flareUpPainLevelInfo')}
          />
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field: { value, onChange } }) => (
          <View className="gap-2">
            <Text className="text-sm font-medium text-strongGray dark:text-white">
              {t('flareUp.stillOngoingQuestion')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {FLARE_UP_STATUS_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-full px-3 py-1.5 ${isActive ? option.activeClassName : 'bg-primaryMuted dark:bg-primaryMutedDark'
                      }`}
                  >
                    <Text
                      className={`text-sm font-medium ${isActive ? option.activeTextClassName : 'text-primary dark:text-white'
                        }`}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="likely_cause"
        render={({ field: { value, onChange } }) => (
          <TriggerChips value={value ? [value] : []} onChange={(next) => onChange(next[next.length - 1] ?? null)} />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('flareUp.description')}
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            info={t('flareUp.descriptionInfo')}
          />
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
