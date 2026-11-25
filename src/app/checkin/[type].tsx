import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useCheckinCelebration } from '@/hooks/useCheckinCelebration';
import { useCheckinsForDate, useUpsertCheckin } from '@/hooks/useCheckins';
import { useFlareUpFollowUpCandidate } from '@/hooks/useFlareUps';
import { usePremium } from '@/hooks/usePremium';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { formatHeadingDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { canLogLate } from '@/lib/lateLogging';
import { colors } from '@/lib/theme';
import { useToday } from '@/store/useTodayStore';

// `?date=yyyy-MM-dd` (from the History calendar's "Log it later") logs a
// missed check-in for yesterday or the day before (src/lib/lateLogging.ts):
// same form, saved with its real date plus logged_late / logged_at. Without
// it, this is today's normal check-in.
export default function CheckinModal() {
  const { type, date } = useLocalSearchParams<{ type: 'morning' | 'evening'; date?: string }>();
  const isMorning = type === 'morning';
  const router = useRouter();
  const { t, locale } = useTranslation();
  const upsertCheckin = useUpsertCheckin();
  const celebration = useCheckinCelebration();
  const { eveningUnlocked } = useTodayStatus();
  const flareUpFollowUpCandidate = useFlareUpFollowUpCandidate();
  const { routines: routinesInRotation } = useRoutinesInRotation();
  // Routines are Premium; the check-in itself never shows a paywall, so
  // free users simply don't get the training step.
  const { isPremium } = usePremium();
  const today = useToday();
  const lateDate = date && date !== today ? date : null;
  const checkinDate = lateDate ?? today;
  const { checkins: existingForDate } = useCheckinsForDate(lateDate ?? '');
  const alreadyLogged = !!lateDate && existingForDate.some((c) => c.type === type);

  const handleSubmit = async (data: CheckinFormData) => {
    celebration.capture();
    const { error } = await upsertCheckin.mutateAsync({
      type: isMorning ? 'morning' : 'evening',
      checkin_date: checkinDate,
      ...data,
      ...(lateDate ? { logged_late: true, logged_at: new Date().toISOString() } : {}),
    });

    return { error };
  };

  // Runs right after a successful save: the "check-in complete" screen
  // (WateringCelebrationHost, a root overlay) goes up first, then this
  // screen pops underneath it. It replaces the success toast, so there's
  // one moment, not two.
  const handleSaved = () => {
    celebration.celebrate(isMorning ? 'morning' : 'evening', checkinDate);
    router.back();
  };

  // Late entries: only within the window, and never over an existing one.
  if (lateDate && (!canLogLate(lateDate, today) || alreadyLogged)) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6 dark:bg-backgroundDark">
        <Ionicons name="time-outline" size={32} color={colors.gray} />
        <Text className="text-center text-base font-semibold text-black dark:text-white">
          {t(alreadyLogged ? 'checkin.alreadyLoggedTitle' : 'checkin.lateNotAllowedTitle')}
        </Text>
        <Text className="text-center text-sm text-gray">
          {t(alreadyLogged ? 'checkin.alreadyLoggedMessage' : 'checkin.lateNotAllowedMessage')}
        </Text>
      </View>
    );
  }

  if (!lateDate && !isMorning && !eveningUnlocked) {
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
      checkinDate={checkinDate}
      submitLabel={t('checkin.saveCheckin')}
      onSubmit={handleSubmit}
      onSaved={handleSaved}
      // The flare-up follow-up and the "did you train today?" step are about
      // today, so a late entry skips both.
      flareUpCandidate={isMorning && !lateDate ? flareUpFollowUpCandidate : null}
      hasRoutinesInRotation={isPremium && !isMorning && !lateDate && routinesInRotation.length > 0}
      header={
        lateDate ? (
          <View className="flex-row items-center gap-2 rounded-xl bg-accentMuted px-4 py-3 dark:bg-segmentTrackDark">
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <Text className="flex-1 text-sm text-ink dark:text-white">
              {t('checkin.lateBanner', { date: formatHeadingDate(parseISO(lateDate), locale) })}
            </Text>
          </View>
        ) : undefined
      }
    />
  );
}
