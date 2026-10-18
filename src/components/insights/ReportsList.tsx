import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useJourney } from '@/hooks/useJourney';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate, toLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

interface ReportRowProps {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isLast?: boolean;
}

function ReportRow({ href, icon, title, subtitle, isLast }: ReportRowProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        className={`flex-row items-center justify-between px-4 py-3.5 active:opacity-60 ${
          isLast ? '' : 'border-b border-gray-200 dark:border-gray-800'
        }`}
      >
        <View className="flex-1 flex-row items-center gap-3">
          <Ionicons name={icon} size={20} color={colors.gray} />
          <View className="flex-1">
            <Text className="text-base text-strongGray dark:text-white">{title}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray">{subtitle}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}

// The entry point for the full-screen reports. `history/patterns` (the
// analyze-patterns AI analysis) used to be linked from nowhere at all, and
// the physio summary was buried three screens deep — never leave a built
// screen unreachable again. The two AI rows follow the same
// `ai_insights_enabled` gate as AskAiCta/PhysioFocusCard.
export function ReportsList() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { assessments } = usePhysioAssessments();
  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  const { trainingEnabled } = useJourney();
  const showPhysioVisits = trainingEnabled || profile?.care_status === 'with_professional';

  const lastRun = (timestamp: string | null | undefined) =>
    timestamp
      ? t('insights.reportLastRun', { date: formatCheckinDate(toLocalDate(timestamp)) })
      : t('insights.reportNotRun');

  if (!aiInsightsEnabled && !showPhysioVisits) return null;

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
        {t('insights.reportsTitle')}
      </Text>
      <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surfaceDark">
        {aiInsightsEnabled && (
          <>
            <ReportRow
              href={'/history/patterns' as Href}
              icon="analytics-outline"
              title={t('insights.reportPatterns')}
              subtitle={lastRun(profile?.last_pattern_analysis_at)}
            />
            <ReportRow
              href={'/history/physio-summary' as Href}
              icon="document-text-outline"
              title={t('insights.reportPhysioSummary')}
              subtitle={lastRun(profile?.last_physio_summary_at)}
              isLast={!showPhysioVisits}
            />
          </>
        )}
        {showPhysioVisits && (
          <ReportRow
            href={'/history/physio-visits' as Href}
            icon="medkit-outline"
            title={t('insights.reportPhysioVisits')}
            subtitle={t('insights.reportVisitCount', { count: assessments.length })}
            isLast
          />
        )}
      </View>
    </View>
  );
}
