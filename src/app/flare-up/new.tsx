import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import { Input } from '@/components/ui/Input';
import { useCreateFlareUp } from '@/hooks/useFlareUps';
import { colors } from '@/lib/theme';
import { flareUpSchema, type FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export default function NewFlareUpModal() {
  const router = useRouter();
  const createFlareUp = useCreateFlareUp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<FlareUpFormData>({
    resolver: zodResolver(flareUpSchema),
    defaultValues: { pain_level: 5, likely_cause: null, description: null },
  });

  const onSubmit = async (data: FlareUpFormData) => {
    setIsSubmitting(true);

    const { error } = await createFlareUp.mutateAsync(data);

    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Flare-up logged.');
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-6 px-6 py-6">
      <Controller
        control={control}
        name="pain_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider label="Pain level" value={value} onChange={onChange} />
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
            label="Description"
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-black py-3 disabled:opacity-50 dark:bg-white"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white dark:text-black">Log Flare-up</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
