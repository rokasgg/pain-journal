import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AskAiCard } from '@/components/insights/AskAiCard';
import { WeekFindings } from '@/components/insights/FindingCard';
import { InsightsTrainingCard } from '@/components/insights/InsightsTrainingCard';
import { PhysioCard } from '@/components/insights/PhysioCard';
import { ReportsList } from '@/components/insights/ReportsList';
import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      {title && (
        <Text className="px-1 text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

// Insights (design: assets/possible-app-design/insight). Top to bottom:
// this week's findings (always), Ask AI (AI on), Training (training on),
// Physio (training on or seeing a professional), Reports (AI on).
// "Prepare for appointments" from onboarding moves Physio above Training.
export default function InsightsScreen() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  const { trainingEnabled } = useJourney();
  const showPhysio = trainingEnabled || profile?.care_status === 'with_professional';
  const physioFirst = profile?.primary_goal === 'prepare_for_appointments';

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({
      predicate: (query) =>
        ['profile', 'checkins', 'flareUps', 'physioAssessments', 'exerciseLogs', 'routines'].includes(
          query.queryKey[0] as string,
        ),
    });
    setRefreshing(false);
  };

  const training = trainingEnabled && (
    <Section key="training" title={t('insights.sectionTraining')}>
      <InsightsTrainingCard />
    </Section>
  );
  const physio = showPhysio && (
    <Section key="physio" title={t('insights.sectionPhysio')}>
      <PhysioCard />
    </Section>
  );

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-6 py-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View className="gap-1 px-1">
          <Text className="text-4xl font-bold text-black dark:text-white">{t('insights.title')}</Text>
          <Text className="text-[15px] text-inkSecondary dark:text-gray">{t('insights.subtitle')}</Text>
        </View>

        <Section title={t('insights.sectionWeek')}>
          <WeekFindings />
        </Section>

        {aiInsightsEnabled && (
          <Section>
            <AskAiCard />
          </Section>
        )}

        {physioFirst ? [physio, training] : [training, physio]}

        {aiInsightsEnabled && (
          <Section title={t('insights.reportsTitle')}>
            <ReportsList />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
