import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckinStatusCard } from '@/components/home/CheckinStatusCard';
import { DaysSinceInjury } from '@/components/home/DaysSinceInjury';
import { TopTriggers } from '@/components/home/TopTriggers';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function HomeScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({
      predicate: (query) => ['profile', 'checkins', 'flareUps'].includes(query.queryKey[0] as string),
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
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-bold text-black dark:text-white">{t('home.title')}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('home.subtitle')}
            </Text>
          </View>
          <DaysSinceInjury />
        </View>

        <CheckinStatusCard />

        <Link href="/flare-up/new" asChild>
          <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark">
            <Text className="font-semibold text-white">{t('home.logFlareUp')}</Text>
          </Pressable>
        </Link>

        <Link href="/checkin/backfill" asChild>
          <Pressable className="items-center py-1">
            <Text className="text-sm font-medium text-primary dark:text-primaryDark">
              {t('home.backfillDay')}
            </Text>
          </Pressable>
        </Link>

        <TopTriggers />
      </ScrollView>
    </SafeAreaView>
  );
}
