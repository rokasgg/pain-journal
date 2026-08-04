import { Controller, type Control } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { InfoButton } from '@/components/ui/InfoButton';
import { Input } from '@/components/ui/Input';
import { SLEEP_POSITION_OPTIONS } from '@/constants/symptoms';
import type { MorningCheckinFormData } from '@/lib/validations/checkin';

export interface MorningFieldsProps {
  control: Control<MorningCheckinFormData>;
}

export function MorningFields({ control }: MorningFieldsProps) {
  return (
    <View className="gap-6">
      <Controller
        control={control}
        name="sleep_quality"
        render={({ field: { value, onChange } }) => (
          <PainSlider
            label="Sleep quality"
            value={value}
            onChange={onChange}
            info="How well you slept overall last night, from 0 (very poor) to 10 (excellent)."
          />
        )}
      />

      <Controller
        control={control}
        name="sleep_hours"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Sleep hours"
            keyboardType="decimal-pad"
            value={value?.toString() ?? ''}
            onChangeText={(text) => onChange(text ? Number(text) : null)}
            onBlur={onBlur}
            info="Roughly how many hours you slept last night."
          />
        )}
      />

      <Controller
        control={control}
        name="woke_up_with_pain"
        render={({ field: { value, onChange } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            className="flex-row items-center justify-between rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base text-black dark:text-white">Woke up with pain</Text>
              <InfoButton
                title="Woke up with pain"
                message="Whether you felt pain immediately upon waking, before getting up or moving around."
              />
            </View>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {value ? 'Yes' : 'No'}
            </Text>
          </Pressable>
        )}
      />

      <Controller
        control={control}
        name="sleep_position"
        render={({ field: { value, onChange } }) => (
          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-medium text-black dark:text-white">Sleep position</Text>
              <InfoButton
                title="Sleep position"
                message="The position you mostly slept in — this can affect neck/back strain overnight."
              />
            </View>
            <View className="flex-row gap-2">
              {SLEEP_POSITION_OPTIONS.map((option) => {
                const isActive = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`flex-1 items-center rounded-lg py-2.5 ${
                      isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isActive ? 'text-white' : 'text-black dark:text-white'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />
    </View>
  );
}
