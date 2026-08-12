import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { daysSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export function DaysSinceHealing() {
  const { t } = useTranslation();
  const { profile } = useProfile();

  if (!profile?.healing_started_on) {
    return (
      <Link href="/(tabs)/settings" asChild>
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-3 py-2 dark:bg-primaryMutedDark">
          <Ionicons name="leaf-outline" size={14} color={colors.primary} />
          <Text className="text-xs font-medium text-black dark:text-white">{t('home.setHealingDate')}</Text>
        </Pressable>
      </Link>
    );
  }

  const days = daysSince(profile.healing_started_on);

  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-3 py-2 dark:bg-primaryMutedDark">
      <Ionicons name="leaf-outline" size={14} color={colors.primary} />
      <Text className="text-xs font-medium text-black dark:text-white"> {t('home.daysSinceHealing', { days })}
      </Text>
    </View>
  );
}
