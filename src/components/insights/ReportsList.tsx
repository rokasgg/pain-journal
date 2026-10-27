import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { formatDayLabel, toLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

interface ReportRowProps {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

function ReportRow({ href, icon, title, subtitle }: ReportRowProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-3 border-t border-borderLight px-4 py-3.5 active:opacity-60 dark:border-borderDark"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-segmentTrackDark">
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-base text-ink dark:text-white">{title}</Text>
          <Text className="text-[13px] text-inkSecondary dark:text-gray">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
      </Pressable>
    </Link>
  );
}

// Insights → Reports (AI only): "Create a new pattern analysis" on top
// (opens history/patterns and starts a run), then the two AI reports with
// their last-generated dates. Physio visits moved into the Physio card.
// Never leave a built report unreachable — give every new one a row here.
export function ReportsList() {
  const { t, locale } = useTranslation();
  const { profile } = useProfile();

  const generatedOn = (timestamp: string | null | undefined) =>
    timestamp ? formatDayLabel(parseISO(toLocalDate(timestamp)), locale, false) : t('insights.reportNotRun');

  return (
    <View className="overflow-hidden rounded-[18px] bg-surface dark:bg-surfaceDark">
      <Link href={{ pathname: '/history/patterns', params: { run: '1' } }} asChild>
        <Pressable accessibilityRole="button" className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-60">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent dark:bg-primaryDark">
            <Ionicons name="add" size={22} color={colors.white} />
          </View>
          <Text className="flex-1 text-base font-semibold text-accent dark:text-primaryDark">
            {t('insights.newPatternAnalysis')}
          </Text>
        </Pressable>
      </Link>
      <ReportRow
        href={'/history/patterns' as Href}
        icon="analytics-outline"
        title={t('insights.reportPatterns')}
        subtitle={generatedOn(profile?.last_pattern_analysis_at)}
      />
      <ReportRow
        href={'/history/physio-summary' as Href}
        icon="document-text-outline"
        title={t('insights.reportPhysioSummary')}
        subtitle={generatedOn(profile?.last_physio_summary_at)}
      />
    </View>
  );
}
