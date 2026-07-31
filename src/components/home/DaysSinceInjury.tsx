import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { daysSince } from '@/lib/dates';

export function DaysSinceInjury() {
  const { profile } = useProfile();

  if (!profile?.injury_started_on) {
    return (
      <Link href="/(tabs)/settings" asChild>
        <Pressable className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Set your injury start date in Settings to track days since injury.
          </Text>
        </Pressable>
      </Link>
    );
  }

  const days = daysSince(profile.injury_started_on);

  return (
    <View className="items-center gap-1 rounded-lg border border-gray-200 py-4 dark:border-gray-800">
      <Text className="text-3xl font-bold text-black dark:text-white">{days}</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">days since injury</Text>
    </View>
  );
}
