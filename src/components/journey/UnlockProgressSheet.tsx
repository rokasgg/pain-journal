import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OakTree } from '@/components/OakTree';
import { getNowAction } from '@/lib/checkinTiming';
import { formatDayCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { JOURNEY_MILESTONES } from '@/lib/journey';
import { getOakStage } from '@/lib/oak';
import { colors } from '@/lib/theme';

export type LockedTabMilestone = 'history' | 'insights';

export interface UnlockProgressSheetProps {
  // null = closed.
  milestone: LockedTabMilestone | null;
  loggedDays: number;
  loggedToday: boolean;
  onClose: () => void;
}

// Feature-specific copy: Lithuanian needs the feature name in a grammatical
// case ("Iki Istorijos", "Iki Įžvalgų"), so these are whole keys rather than
// a {{feature}} slot.
const COPY: Record<LockedTabMilestone, { title: string; body: string; loggedBody: string }> = {
  history: {
    title: 'journey.sheet.historyTitle',
    body: 'journey.sheet.historyBody',
    loggedBody: 'journey.sheet.historyLoggedBody',
  },
  insights: {
    title: 'journey.sheet.insightsTitle',
    body: 'journey.sheet.insightsBody',
    loggedBody: 'journey.sheet.insightsLoggedBody',
  },
};

// Opening a check-in right as this real <Modal> dismisses would hit the
// documented Modal-vs-navigation race — let the fade finish first.
const NAVIGATE_AFTER_CLOSE_MS = 300;

// Bottom sheet shown when tapping a still-locked History/Insights tab —
// design from assets/possible-app-design/message. Two states: today not yet
// logged (dashed "today" segment, "Log today" / "Later") and today already
// logged ("Today counts" + ✓ badge, "Got it").
export function UnlockProgressSheet({ milestone, loggedDays, loggedToday, onClose }: UnlockProgressSheetProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!milestone) return null;

  const total = JOURNEY_MILESTONES.find((m) => m.key === milestone)?.days ?? 0;
  const done = Math.min(loggedDays, total);
  const remaining = Math.max(total - loggedDays, 1);
  const copy = COPY[milestone];
  const nominativeDays = formatDayCount(remaining, locale);

  const handleLogToday = () => {
    onClose();
    const hour = new Date().getHours();
    const action = getNowAction({ hour, morningDone: false, eveningDone: false }) ?? 'morning';
    setTimeout(() => router.push(action === 'evening' ? '/checkin/evening' : '/checkin/morning'), NAVIGATE_AFTER_CLOSE_MS);
  };

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} accessibilityLabel={t('common.close')} />

        <Animated.View
          entering={SlideInDown.duration(320)}
          className="items-center gap-5 rounded-t-[32px] bg-white px-6 pt-3 dark:bg-surfaceDark"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="h-1.5 w-10 rounded-full bg-borderLight dark:bg-borderDark" />

          <View className="mt-2 h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <OakTree stage={getOakStage(loggedDays)} size={64} variant="icon" />
            {loggedToday && (
              <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-primary dark:border-surfaceDark dark:bg-primaryDark">
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </View>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-center text-2xl font-bold text-black dark:text-white">
              {loggedToday ? t('journey.sheet.loggedTitle') : t(copy.title, { days: nominativeDays })}
            </Text>
            <Text className="text-center text-base text-strongGray dark:text-white/80">
              {loggedToday
                ? t(copy.loggedBody, { days: nominativeDays })
                : t(copy.body, { days: formatDayCount(remaining, locale, 'accusative') })}
            </Text>
          </View>

          <View className="w-full gap-2">
            <View className="flex-row gap-1.5">
              {Array.from({ length: total }, (_, index) => {
                const isDone = index < done;
                const isToday = !loggedToday && index === done;
                return (
                  <View
                    key={index}
                    className={`h-2.5 flex-1 rounded-full ${
                      isDone
                        ? 'bg-primary dark:bg-primaryDark'
                        : isToday
                          ? 'border border-dashed border-primary dark:border-primaryDark'
                          : // Upcoming days: visible grey "slots" (not gray-200 —
                            // tailwind.config's single-value `gray` wipes the
                            // gray-N scale, so those classes don't exist).
                            'bg-borderLight dark:bg-borderDark'
                    }`}
                  />
                );
              })}
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-black dark:text-white">
                {t('journey.sheet.progressLabel', { done, total })}
              </Text>
              <Text className="text-sm text-gray">
                {loggedToday ? t('journey.sheet.nextTomorrow') : t('journey.sheet.notLoggedYet')}
              </Text>
            </View>
          </View>

          <View className="w-full gap-1">
            <Pressable
              onPress={loggedToday ? onClose : handleLogToday}
              accessibilityRole="button"
              className="items-center rounded-2xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
            >
              <Text className="text-base font-semibold text-white">
                {loggedToday ? t('journey.sheet.gotIt') : t('journey.sheet.logToday')}
              </Text>
            </Pressable>
            {!loggedToday && (
              <Pressable onPress={onClose} accessibilityRole="button" className="items-center py-3 active:opacity-60">
                <Text className="text-base font-semibold text-primary dark:text-white">{t('journey.sheet.later')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
