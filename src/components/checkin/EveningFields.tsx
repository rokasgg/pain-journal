import { Controller, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { PainSlider } from '@/components/checkin/PainSlider';
import type { EveningCheckinFormData } from '@/lib/validations/checkin';

export interface EveningFieldsProps {
  control: Control<EveningCheckinFormData>;
}

export function EveningFields({ control }: EveningFieldsProps) {
  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="activity_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider label="Activity level" value={value} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="screen_time_hours"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Screen time (hours)"
            keyboardType="decimal-pad"
            value={value?.toString() ?? ''}
            onChangeText={(text) => onChange(text ? Number(text) : null)}
            onBlur={onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="did_exercises"
        render={({ field: { value, onChange } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            className="flex-row items-center justify-between rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
          >
            <Text className="text-base text-black dark:text-white">Did PT/stretches today</Text>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {value ? 'Yes' : 'No'}
            </Text>
          </Pressable>
        )}
      />

      <Controller
        control={control}
        name="exercise_notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Exercise notes"
            multiline
            numberOfLines={3}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />
    </View>
  );
}
