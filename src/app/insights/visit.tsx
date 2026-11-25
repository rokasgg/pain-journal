import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { PhysioCard } from '@/components/insights/PhysioCard';
import { ReportsList } from '@/components/insights/ReportsList';
import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';
import { useVisitReport } from '@/hooks/useVisitReport';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { PremiumScreen } from '@/components/premium/PremiumScreen';

// For anyone not tracking physio visits: just the PDF. PhysioCard has the
// same button built in.
function SummaryCard() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const report = useVisitReport();
  return (
    <View className="gap-2 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
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
            <Text className="text-base font-semibold text-[#1F3E2C] dark:text-white">{t('insights.prepareSummary')}</Text>
          </>
        )}
      </Pressable>
      <Text className="text-center text-[13px] text-inkSecondary dark:text-gray">
        {t(report.sinceLastVisit ? 'insights.prepareSummaryHint' : 'insights.prepareSummaryHint30')}
      </Text>
    </View>
  );
}

// "Prepare for visit" (Insights tool tile): the summary PDF, physio visits
// (when tracked) and the AI reports (when AI is on). Moved off the Insights
// page so that page only answers "what have I learned?".
function VisitScreenContent() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { trainingEnabled } = useJourney();
  const showPhysio = trainingEnabled || profile?.care_status === 'with_professional';
  const aiOn = profile?.ai_insights_enabled ?? true;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-7 px-6 py-6">
      {showPhysio ? <PhysioCard /> : <SummaryCard />}
      {aiOn && (
        <View className="gap-3">
          <Text className="px-1 text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
            {t('insights.reportsTitle')}
          </Text>
          <ReportsList />
        </View>
      )}
    </ScrollView>
  );
}

// Premium-only (CLAUDE.md "Premium"): the content's hooks never run for free users.
export default function VisitScreen() {
  return (
    <PremiumScreen feature="report">
      <VisitScreenContent />
    </PremiumScreen>
  );
}
