import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { todayLocalDate } from '@/lib/dates';
import type { CheckinType } from '@/types/database.types';
import { toast } from '@/utils/toast';

export default function BackfillModal() {
  const router = useRouter();
  const upsertCheckin = useUpsertCheckin();
  const [checkinDate, setCheckinDate] = useState<string>(todayLocalDate());
  const [checkinType, setCheckinType] = useState<CheckinType>('morning');

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: checkinType,
      checkin_date: checkinDate,
      ...data,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Check-in saved!');
    router.back();
  };

  return (
    <CheckinForm
      key={checkinType}
      type={checkinType}
      submitLabel="Save Check-in"
      onSubmit={handleSubmit}
      header={
        <View className="gap-6">
          <DatePickerField label="Date" value={checkinDate} onChange={setCheckinDate} maximumDate={new Date()} />

          <View className="gap-2">
            <Text className="text-sm font-medium text-black dark:text-white">Type</Text>
            <View className="flex-row gap-2">
              {(['morning', 'evening'] as const).map((option) => {
                const isActive = checkinType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setCheckinType(option)}
                    className={`flex-1 items-center rounded-lg py-2.5 ${
                      isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium capitalize ${
                        isActive ? 'text-white' : 'text-black dark:text-white'
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      }
    />
  );
}
