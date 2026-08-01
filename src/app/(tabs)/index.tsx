import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckinStatusCard } from '@/components/home/CheckinStatusCard';
import { DaysSinceInjury } from '@/components/home/DaysSinceInjury';
import { TrendSparkline } from '@/components/home/TrendSparkline';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <Text className="text-2xl font-bold text-black dark:text-white">Today</Text>

        <DaysSinceInjury />
        <CheckinStatusCard />

        <Link href="/flare-up/new" asChild>
          <Pressable className="items-center rounded-lg border border-red-600 py-3 dark:border-red-500">
            <Text className="font-semibold text-red-600 dark:text-red-500">Log a flare-up</Text>
          </Pressable>
        </Link>

        <View className="gap-2">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Last 7 days
          </Text>
          <TrendSparkline />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
