import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import { toast } from '@/utils/toast';

export default function CheckinModal() {
  const { type } = useLocalSearchParams<{ type: 'morning' | 'evening' }>();
  const isMorning = type === 'morning';
  const router = useRouter();
  const { t } = useTranslation();
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

    router.back();
    toast.success(t('checkin.savedToast', { type: t(isMorning ? 'home.morning' : 'home.evening') }));
    useCelebrationStore.getState().show();
  };

  if (!isMorning && !eveningUnlocked) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6 dark:bg-backgroundDark">
        <Ionicons name="lock-closed" size={32} color={colors.gray} />
        <Text className="text-center text-base font-semibold text-black dark:text-white">
          {t('checkin.eveningLockedTitle')}
        </Text>
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('checkin.eveningLockedMessage')}
        </Text>
      </View>
    );
  }

  return (
    <CheckinForm
      type={isMorning ? 'morning' : 'evening'}
      submitLabel={t('checkin.saveCheckin')}
      onSubmit={handleSubmit}
    />
  );
}
