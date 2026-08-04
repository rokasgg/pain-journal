import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { todayLocalDate } from '@/lib/dates';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function CheckinModal() {
  const { type } = useLocalSearchParams<{ type: 'morning' | 'evening' }>();
  const isMorning = type === 'morning';
  const router = useRouter();
  const upsertCheckin = useUpsertCheckin();
  const { eveningUnlocked } = useTodayStatus();

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: isMorning ? 'morning' : 'evening',
      checkin_date: todayLocalDate(),
      ...data,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(`${isMorning ? 'Morning' : 'Evening'} check-in saved!`);
    router.back();
  };

  if (!isMorning && !eveningUnlocked) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6 dark:bg-backgroundDark">
        <Ionicons name="lock-closed" size={32} color={colors.gray} />
        <Text className="text-center text-base font-semibold text-black dark:text-white">
          Evening check-in is locked
        </Text>
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
          Evening check-in unlocks at 16:00.
        </Text>
      </View>
    );
  }

  return <CheckinForm type={isMorning ? 'morning' : 'evening'} submitLabel="Save Check-in" onSubmit={handleSubmit} />;
}
