import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { BOLD_MARK, TextWithBold } from '@/components/ui/TextWithBold';
import { useUpdatePhysioAssessment } from '@/hooks/usePhysioAssessments';
import { formatDayLabel } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { PhysioAssessment } from '@/types/database.types';
import { toast } from '@/utils/toast';

const PICKER_LOCALES = { en: 'en-GB', lt: 'lt-LT' } as const;

/** Saves a new next_visit_date on a visit, passing its findings through unchanged. */
export function useRescheduleNextVisit() {
  const updateAssessment = useUpdatePhysioAssessment();

  return async (visit: PhysioAssessment, date: Date) => {
    // The update deletes and reinserts findings (same as
    // physio-visit/edit/[id].tsx), so they're passed through as they are.
    const { error } = await updateAssessment.mutateAsync({
      id: visit.id,
      assessment: {
        visit_date: visit.visit_date,
        physio_name: visit.physio_name,
        overall_notes: visit.overall_notes,
        next_visit_date: format(date, 'yyyy-MM-dd'),
        questions: visit.questions,
      },
      findings: (visit.muscle_findings ?? []).map((finding) => ({
        muscle_name: finding.muscle_name,
        status: finding.status,
        side: finding.side as 'left' | 'right' | 'bilateral' | null,
        severity: finding.severity,
        notes: finding.notes,
      })),
    });
    if (error) toast.error(error);
  };
}

export interface VisitOverdueBannerProps {
  /** The latest visit, whose planned next visit has passed. */
  visit: PhysioAssessment;
  /** overdueNextVisit(visit, today): the date that passed. */
  overdueDate: string;
  /** `card`: its own rounded card (top of Insights). `inset`: inside PhysioCard. */
  variant?: 'card' | 'inset';
}

// "Did your visit on 21 Oct happen?" — something to answer, not a tool to
// browse for. Yes logs the visit (date filled in); No, reschedule opens a
// date picker and saves a new next visit. Shown at the top of Insights and
// inside the Physio card on insights/visit.
export function VisitOverdueBanner({ visit, overdueDate, variant = 'card' }: VisitOverdueBannerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const reschedule = useRescheduleNextVisit();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleConfirm = async (date: Date) => {
    setIsPickerOpen(false);
    await reschedule(visit, date);
  };

  return (
    <View
      className={
        variant === 'card'
          ? 'gap-3 rounded-[18px] bg-creamTint p-4 dark:bg-creamTintDark'
          : 'gap-3 rounded-xl bg-creamTint p-3.5 dark:bg-creamTintDark'
      }
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="calendar-outline" size={18} color="#B7791F" />
        <TextWithBold
          className="flex-1 text-[15px] text-ink dark:text-white"
          text={t('insights.visitHappened', { date: BOLD_MARK })}
          bold={formatDayLabel(parseISO(overdueDate), locale, false)}
        />
      </View>
      <View className="flex-row gap-2 pl-6">
        <Pressable
          onPress={() => router.push(`/physio-visit/new?date=${overdueDate}` as Href)}
          accessibilityRole="button"
          className="h-10 items-center justify-center rounded-lg bg-accent px-4 active:opacity-80 dark:bg-primaryDark"
        >
          <Text className="text-[15px] font-semibold text-white">{t('common.yes')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsPickerOpen(true)}
          accessibilityRole="button"
          className="h-10 items-center justify-center rounded-lg border border-borderLight bg-surface px-4 active:opacity-70 dark:border-borderDark dark:bg-surfaceDark"
        >
          <Text className="text-[15px] font-semibold text-ink dark:text-white">{t('insights.visitReschedule')}</Text>
        </Pressable>
      </View>

      <DateTimePickerModal
        isVisible={isPickerOpen}
        mode="date"
        display="inline"
        date={new Date()}
        minimumDate={new Date()}
        locale={PICKER_LOCALES[locale]}
        confirmTextIOS={t('injuryInfo.confirmDate')}
        cancelTextIOS={t('common.cancel')}
        accentColor={colors.accent}
        buttonTextColorIOS={colors.accent}
        isDarkModeEnabled={isDark}
        themeVariant={isDark ? 'dark' : 'light'}
        onConfirm={handleConfirm}
        onCancel={() => setIsPickerOpen(false)}
      />
    </View>
  );
}
