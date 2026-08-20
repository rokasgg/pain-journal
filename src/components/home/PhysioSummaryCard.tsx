import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export function PhysioSummaryCard() {
  const { t } = useTranslation();
  const { profile } = useProfile();

  const generatedAt = profile?.last_physio_summary_at ?? null;

  return (
    <Link href="/history/physio-summary" asChild>
      <Pressable className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark border">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('home.physioSummaryTitle')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray">
            {generatedAt
              ? t('home.physioSummaryGeneratedOn', { date: formatCheckinDate(generatedAt.slice(0, 10)) })
              : t('home.physioSummarySubtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}
