import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useCheckinHistory, useUpsertCheckin } from '@/hooks/useCheckins';
import { formatCheckinDate } from '@/lib/dates';
import { toast } from '@/utils/toast';
import type { Checkin } from '@/types/database.types';

function toFormData(checkin: Checkin): CheckinFormData {
  const shared = {
    pain_level: checkin.pain_level,
    stiffness_level: checkin.stiffness_level,
    range_of_motion: checkin.range_of_motion,
    symptoms: checkin.symptoms,
    triggers: checkin.triggers,
    notes: checkin.notes,
  };

  if (checkin.type === 'morning') {
    return {
      ...shared,
      sleep_quality: checkin.sleep_quality,
      sleep_hours: checkin.sleep_hours,
      woke_up_with_pain: checkin.woke_up_with_pain,
      sleep_position: checkin.sleep_position,
    };
  }

  return {
    ...shared,
    activity_level: checkin.activity_level,
    screen_time_hours: checkin.screen_time_hours,
    did_exercises: checkin.did_exercises,
    exercise_notes: checkin.exercise_notes,
  };
}

export default function EditCheckinModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { checkins } = useCheckinHistory(90);
  const upsertCheckin = useUpsertCheckin();

  const checkin = checkins.find((c) => c.id === id);

  if (!checkin) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: checkin.type,
      checkin_date: checkin.checkin_date,
      ...data,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Check-in updated!');
    router.back();
  };

  return (
    <CheckinForm
      type={checkin.type}
      defaultValues={toFormData(checkin)}
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
      header={
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {formatCheckinDate(checkin.checkin_date)} · {checkin.type}
        </Text>
      }
    />
  );
}
