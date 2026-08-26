import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export function PatternAnalysisCard() {
  const { t } = useTranslation();
  const { profile } = useProfile();

  const analyzedAt = profile?.last_pattern_analysis_at ?? null;

  return (
    <Link href="/history/patterns" asChild>
      <Pressable className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark border">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('insights.patternAnalysisTitle')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray">
            {analyzedAt
              ? t('insights.patternAnalysisGeneratedOn', { date: formatCheckinDate(analyzedAt.slice(0, 10)) })
              : t('insights.patternAnalysisSubtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}
