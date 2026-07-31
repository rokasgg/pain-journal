import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EveningFields } from '@/components/checkin/EveningFields';
import { MorningFields } from '@/components/checkin/MorningFields';
import { PainSlider } from '@/components/checkin/PainSlider';
import { SymptomCheckboxes } from '@/components/checkin/SymptomCheckboxes';
import { TriggerChips } from '@/components/checkin/TriggerChips';
import type { CheckinType } from '@/types/database.types';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { colors } from '@/lib/theme';
import {
  eveningCheckinSchema,
  morningCheckinSchema,
  type EveningCheckinFormData,
  type MorningCheckinFormData,
} from '@/lib/validations/checkin';
import { toast } from '@/utils/toast';

type CheckinFormData = MorningCheckinFormData | EveningCheckinFormData;

const morningDefaults: MorningCheckinFormData = {
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

const eveningDefaults: EveningCheckinFormData = {
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

export default function BackfillModal() {
  const router = useRouter();
  const upsertCheckin = useUpsertCheckin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [checkinType, setCheckinType] = useState<CheckinType>('morning');
  const isMorning = checkinType === 'morning';

  const schema = isMorning ? morningCheckinSchema : eveningCheckinSchema;
  const defaultValues = useMemo(() => (isMorning ? morningDefaults : eveningDefaults), [isMorning]);

  const { control, handleSubmit, reset } = useForm<CheckinFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const selectType = (nextType: CheckinType) => {
    setCheckinType(nextType);
    reset(nextType === 'morning' ? morningDefaults : eveningDefaults);
  };

  const onSubmit = async (data: CheckinFormData) => {
    setIsSubmitting(true);

    const { error } = await upsertCheckin.mutateAsync({
      type: checkinType,
      checkin_date: format(date, 'yyyy-MM-dd'),
      ...data,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Check-in saved!');
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-6 px-6 py-6">
      <View className="gap-2">
        <Text className="text-sm font-medium text-black dark:text-white">Date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
        >
          <Text className="text-black dark:text-white">{format(date, 'EEE, MMM d yyyy')}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-black dark:text-white">Type</Text>
        <View className="flex-row gap-2">
          {(['morning', 'evening'] as const).map((option) => {
            const isActive = checkinType === option;
            return (
              <Pressable
                key={option}
                onPress={() => selectType(option)}
                className={`flex-1 items-center rounded-lg py-2.5 ${
                  isActive ? 'bg-black dark:bg-white' : 'border border-gray-300 dark:border-gray-700'
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    isActive ? 'text-white dark:text-black' : 'text-black dark:text-white'
                  }`}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-black py-3 disabled:opacity-50 dark:bg-white"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white dark:text-black">Save Check-in</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
