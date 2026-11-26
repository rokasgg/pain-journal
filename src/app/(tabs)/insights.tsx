import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FindingsList } from '@/components/insights/FindingsList';
import { InsightsTools } from '@/components/insights/InsightsTools';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Insights answers one question: "what have I learned about my pain?". The
// app's purpose is "log quickly, then learn what makes my pain better or
// worse", and this page is the payoff. So it's only two things:
//  * at the top, three compact tools (Ask AI, Experiments, Visit prep), with a
//    "did your visit happen?" banner above them when that's waiting
//  * "What I've learned": the top 3 findings, strongest first
//    (src/lib/findings.ts), with "Show all N" for the rest
// Training lives on Home; physio visits and the AI reports are behind
// "Prepare for visit" (insights/visit). Don't stack new sections here: add a
// finding to findings.ts, or put it behind a tool.
export default function InsightsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({
      predicate: (query) =>
        ['profile', 'checkins', 'flareUps', 'physioAssessments', 'exerciseLogs', 'experiments', 'experimentDays'].includes(
          query.queryKey[0] as string,
        ),
    });
    setRefreshing(false);
  };

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

        <InsightsTools />

        <View className="gap-3">
          <Text className="px-1 text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
            {t('insights.found.title')}
          </Text>
          <FindingsList />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
