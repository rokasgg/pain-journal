import { Controller, useWatch, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { InfoButton } from '@/components/ui/InfoButton';
import { Input } from '@/components/ui/Input';
import type { EveningCheckinFormData } from '@/lib/validations/checkin';

export interface EveningFieldsProps {
  control: Control<EveningCheckinFormData>;
}

export function EveningFields({ control }: EveningFieldsProps) {
  const didExercises = useWatch({ control, name: 'did_exercises' });

  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="activity_level"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label="Activity level"
            value={value}
            onChange={onChange}
            info="How physically active your day was overall — walking, chores, work — not a dedicated workout. That's tracked separately below if you did one."
          />
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
            info="Roughly how many hours you spent looking at a screen today (phone, computer, TV) — prolonged screen time is a common neck-strain trigger."
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
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base text-black dark:text-white">Did PT/stretches today</Text>
              <InfoButton
                title="Did PT/stretches today"
                message="Whether you did a dedicated physical therapy, stretching, or exercise session today — separate from your day's general activity level above."
              />
            </View>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {value ? 'Yes' : 'No'}
            </Text>
          </Pressable>
        )}
      />

      {didExercises && (
        <>
          <Controller
            control={control}
            name="exercise_intensity"
            render={({ field: { value, onChange } }) => (
              <PainSlider
                label="Exercise intensity"
                value={value}
                onChange={onChange}
                minLabel="Light"
                maxLabel="Intense"
                info="How intense that exercise/PT session felt, from 0 (very light) to 10 (very intense)."
              />
            )}
          />

          <Controller
            control={control}
            name="exercise_hours"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Exercise hours"
                keyboardType="decimal-pad"
                value={value?.toString() ?? ''}
                onChangeText={(text) => onChange(text ? Number(text) : null)}
                onBlur={onBlur}
                info="Roughly how long that exercise/PT session lasted, in hours."
              />
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
                info="Any details about what you did — e.g. which stretches, exercises, or activities."
              />
            )}
          />
        </>
      )}
    </View>
  );
}
