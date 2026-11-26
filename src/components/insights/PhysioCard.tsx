import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { useRescheduleNextVisit, VisitOverdueBanner } from '@/components/insights/VisitOverdueBanner';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useVisitReport } from '@/hooks/useVisitReport';
import { formatShortDayLabel } from '@/lib/dates';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { overdueNextVisit } from '@/lib/physioVisits';
import { colors } from '@/lib/theme';
import type { PhysioAssessment } from '@/types/database.types';
import { useToday } from '@/store/useTodayStore';

const PICKER_LOCALES = { en: 'en-GB', lt: 'lt-LT' } as const;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[13px] text-inkSecondary dark:text-gray">{label}</Text>
      {children}
    </View>
  );
}

// Insights → Physio: one card for everything about visits.
//  - overdue banner: the planned next visit has passed and nothing newer is
//    logged → "Did it happen?" Yes (log it, date filled in) / No, reschedule
//  - Last · Next · Total
//  - "Prepare a summary for the visit": the user's data since the last
//    visit as a PDF (useVisitReport, no AI)
//  - "All visits" → history/physio-visits
export function PhysioCard() {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const { assessments, isLoading } = usePhysioAssessments();
  const reschedule = useRescheduleNextVisit();
  const report = useVisitReport();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const today = useToday();
  const latest: PhysioAssessment | undefined = assessments[0];
  const overdue = overdueNextVisit(latest, today);

  const saveNextVisit = async (date: Date) => {
    setIsPickerOpen(false);
    if (latest) await reschedule(latest, date);
  };

  if (isLoading) {
    return (
      <View className="items-center rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (!latest) {
    return (
      <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-sm text-inkSecondary dark:text-gray">{t('insights.noVisitsYet')}</Text>
        <Link href={'/physio-visit/new' as Href} asChild>
          <Pressable className="h-12 items-center justify-center rounded-xl bg-accentMuted active:opacity-70 dark:bg-segmentTrackDark">
            <Text className="text-base font-semibold text-[#1F3E2C] dark:text-white">{t('physioVisit.logVisit')}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const nextIsUpcoming = !!latest.next_visit_date && latest.next_visit_date >= today;

  return (
    <View className="rounded-[18px] bg-surface dark:bg-surfaceDark">
      <View className="gap-4 p-4">
        {overdue && <VisitOverdueBanner visit={latest} overdueDate={overdue} variant="inset" />}

        <View className="flex-row gap-3">
          <Stat label={t('insights.statLast')}>
            <Text className="text-base font-bold text-ink dark:text-white">
              {formatShortDayLabel(parseISO(latest.visit_date), locale)}
            </Text>
          </Stat>
          <Stat label={t('insights.statNext')}>
            {nextIsUpcoming ? (
              <Pressable onPress={() => setIsPickerOpen(true)} accessibilityRole="button" hitSlop={8}>
                <Text className="text-base font-bold text-ink dark:text-white">
                  {formatShortDayLabel(parseISO(latest.next_visit_date as string), locale)}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setIsPickerOpen(true)} accessibilityRole="button" hitSlop={8}>
                <Text className="text-base font-bold text-accent dark:text-primaryDark">{t('insights.statAdd')}</Text>
              </Pressable>
            )}
          </Stat>
          <Stat label={t('insights.statTotal')}>
            <Text className="text-base font-bold text-ink dark:text-white">
              {formatCount(assessments.length, 'visit', locale)}
            </Text>
          </Stat>
        </View>

        <View className="gap-2">
          <Pressable
            onPress={report.share}
            disabled={report.isPreparing}
            accessibilityRole="button"
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-accentMuted active:opacity-70 dark:bg-segmentTrackDark"
          >
            {report.isPreparing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={isDark ? colors.white : '#1F3E2C'} />
                <Text className="text-base font-semibold text-[#1F3E2C] dark:text-white">
                  {t('insights.prepareSummary')}
                </Text>
              </>
            )}
          </Pressable>
          <Text className="text-center text-[13px] text-inkSecondary dark:text-gray">
            {t(report.sinceLastVisit ? 'insights.prepareSummaryHint' : 'insights.prepareSummaryHint30')}
          </Text>
        </View>
      </View>

      <Link href={'/history/physio-visits' as Href} asChild>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center justify-between border-t border-borderLight px-4 py-3 active:opacity-60 dark:border-borderDark"
        >
          <Text className="text-base text-ink dark:text-white">{t('insights.allVisits')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
        </Pressable>
      </Link>

      <DateTimePickerModal
        isVisible={isPickerOpen}
        mode="date"
        display="inline"
        date={latest.next_visit_date && nextIsUpcoming ? parseISO(latest.next_visit_date) : new Date()}
        minimumDate={new Date()}
        locale={PICKER_LOCALES[locale]}
        confirmTextIOS={t('injuryInfo.confirmDate')}
        cancelTextIOS={t('common.cancel')}
        accentColor={colors.accent}
        buttonTextColorIOS={colors.accent}
        isDarkModeEnabled={isDark}
        themeVariant={isDark ? 'dark' : 'light'}
        onConfirm={saveNextVisit}
        onCancel={() => setIsPickerOpen(false)}
      />
    </View>
  );
}
