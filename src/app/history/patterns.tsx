import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAnalyzePatterns } from '@/hooks/useAnalyzePatterns';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function PatternsModal() {
  const { t } = useTranslation();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { mutateAsync, isPending } = useAnalyzePatterns();

  const handleRun = async () => {
    const result = await mutateAsync();
    if (result.error) toast.error(result.error);
  };

  const analysis = profile?.last_pattern_analysis ?? null;
  const analyzedAt = profile?.last_pattern_analysis_at ?? null;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {t('patterns.description')}
      </Text>

      {isProfileLoading ? (
        <ActivityIndicator />
      ) : analysis ? (
        <View className="gap-2">
          {analyzedAt && (
            <Text className="text-xs uppercase text-gray-500 dark:text-gray-400">
              {t('patterns.lastRun', { date: formatCheckinDate(analyzedAt.slice(0, 10)) })}
            </Text>
          )}
          <Text className="text-base leading-6 text-black dark:text-white">{analysis}</Text>
        </View>
      ) : (
        <Text className="text-base text-gray-500 dark:text-gray-400">
          {t('patterns.noAnalysisYet')}
        </Text>
      )}

      <Pressable
        onPress={handleRun}
        disabled={isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">
            {analysis ? t('patterns.reRunAnalysis') : t('patterns.runAnalysis')}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
