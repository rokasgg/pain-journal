import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TodaysRoutineCard } from '@/components/home/TodaysRoutineCard';
import { AskAiCta } from '@/components/insights/AskAiCta';
import { ExerciseFocusCard } from '@/components/insights/ExerciseFocusCard';
import { PhysioFocusCard } from '@/components/insights/PhysioFocusCard';
import { ReportsList } from '@/components/insights/ReportsList';
import { TrainingPayoffCard } from '@/components/insights/TrainingPayoffCard';
import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // AI features are opt-in via onboarding (defaultable to true from
  // Settings' "AI insights" toggle for existing profiles).
  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  const { trainingEnabled } = useJourney();

  // Onboarding's "primary goal" answer decides whether the physio-focus
  // summary leads the tab — "prepare for appointments" cares most about it.
  // Everything else keeps the standard order.
  const physioFocusFirst = profile?.primary_goal === 'prepare_for_appointments';

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({
      predicate: (query) =>
        ['profile', 'checkins', 'flareUps', 'physioAssessments'].includes(query.queryKey[0] as string),
    });
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View>
          <Text className="text-2xl font-bold text-black dark:text-white">{t('insights.title')}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray">{t('insights.subtitle')}</Text>
        </View>

        <View className="gap-3">
          {trainingEnabled && (
            <>
              <TodaysRoutineCard />
              <TrainingPayoffCard />
              <ExerciseFocusCard />
            </>
          )}
          {physioFocusFirst && aiInsightsEnabled && <PhysioFocusCard />}
          {aiInsightsEnabled && <AskAiCta />}
          {!physioFocusFirst && aiInsightsEnabled && <PhysioFocusCard />}
          {/* <TopTriggers /> */}
        </View>

        <ReportsList />
      </ScrollView>
    </SafeAreaView>
  );
}
