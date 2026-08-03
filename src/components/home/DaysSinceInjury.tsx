import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { daysSince } from '@/lib/dates';
import { colors } from '@/lib/theme';

export function DaysSinceInjury() {
  const { profile } = useProfile();

  if (!profile?.injury_started_on) {
    return (
      <Link href="/(tabs)/settings" asChild>
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-3 py-2 dark:bg-primaryMutedDark">
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text className="text-xs font-medium text-black dark:text-white">Set injury date</Text>
        </Pressable>
      </Link>
    );
  }

  const days = daysSince(profile.injury_started_on);

  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-3 py-2 dark:bg-primaryMutedDark">
      <Ionicons name="time-outline" size={14} color={colors.primary} />
      <Text className="text-xs font-medium text-black dark:text-white">{days} days since injury</Text>
    </View>
  );
}
