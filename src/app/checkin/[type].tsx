import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useCheckinsForDate, useUpsertCheckin } from '@/hooks/useCheckins';
import { useFlareUpFollowUpCandidate } from '@/hooks/useFlareUps';
import { useRoutinesInRotation } from '@/hooks/useRoutines';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { formatHeadingDate, todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { canLogLate } from '@/lib/lateLogging';
import { colors } from '@/lib/theme';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import { toast } from '@/utils/toast';

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
  const { eveningUnlocked } = useTodayStatus();
  const flareUpFollowUpCandidate = useFlareUpFollowUpCandidate();
  const { routines: routinesInRotation } = useRoutinesInRotation();
  const today = todayLocalDate();
  const lateDate = date && date !== today ? date : null;
  const checkinDate = lateDate ?? today;
  const { checkins: existingForDate } = useCheckinsForDate(lateDate ?? '');
  const alreadyLogged = !!lateDate && existingForDate.some((c) => c.type === type);

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: isMorning ? 'morning' : 'evening',
      checkin_date: checkinDate,
      ...data,
      ...(lateDate ? { logged_late: true, logged_at: new Date().toISOString() } : {}),
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
      hasRoutinesInRotation={!isMorning && !lateDate && routinesInRotation.length > 0}
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
