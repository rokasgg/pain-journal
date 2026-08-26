import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AskAiCta } from '@/components/insights/AskAiCta';
import { PhysioFocusCard } from '@/components/insights/PhysioFocusCard';
import { TodaysFocusCard } from '@/components/insights/TodaysFocusCard';
import { TopTriggers } from '@/components/insights/TopTriggers';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function InsightsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

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
          <TodaysFocusCard />
          <AskAiCta />
          <PhysioFocusCard />
          <TopTriggers />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
