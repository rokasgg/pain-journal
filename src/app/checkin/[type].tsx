import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { ExerciseRoutineCheckinCard } from '@/components/checkin/ExerciseRoutineCheckinCard';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { useFlareUpFollowUpCandidate } from '@/hooks/useFlareUps';
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
  const flareUpFollowUpCandidate = useFlareUpFollowUpCandidate();

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: isMorning ? 'morning' : 'evening',
      checkin_date: todayLocalDate(),
      ...data,
    });

    return { error };
  };

  // Runs right after a successful save. Toast fires *before* router.back() —
  // not after — so the toast overlay (and its checkmark animation) mounts
  // and starts painting while this screen is still frontmost, instead of
  // racing the outgoing screen-transition animation. Firing it after
  // router.back() let the transition eat into the checkmark's first frames,
  // so by the time the overlay was actually visible the animation looked
  // like it started halfway through.
  const handleSaved = () => {
    toast.success(t('checkin.savedToast', { type: t(isMorning ? 'home.morning' : 'home.evening') }));
    useCelebrationStore.getState().show();
    router.back();
  };

  if (!isMorning && !eveningUnlocked) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6 dark:bg-backgroundDark">
        <Ionicons name="lock-closed" size={32} color={colors.gray} />
        <Text className="text-center text-base font-semibold text-black dark:text-white">
          {t('checkin.eveningLockedTitle')}
        </Text>
        <Text className="text-center text-sm text-gray-500 dark:text-gray">
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
      onSaved={handleSaved}
      flareUpCandidate={isMorning ? flareUpFollowUpCandidate : null}
      header={!isMorning ? <ExerciseRoutineCheckinCard /> : undefined}
    />
  );
}
