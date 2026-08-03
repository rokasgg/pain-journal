import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAnalyzePatterns } from '@/hooks/useAnalyzePatterns';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function PatternsModal() {
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
        Claude looks at your last 90 days of check-ins and flare-ups to surface correlations you
        might not notice from the chart alone.
      </Text>

      {isProfileLoading ? (
        <ActivityIndicator />
      ) : analysis ? (
        <View className="gap-2">
          {analyzedAt && (
            <Text className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Last run {formatCheckinDate(analyzedAt.slice(0, 10))}
            </Text>
          )}
          <Text className="text-base leading-6 text-black dark:text-white">{analysis}</Text>
        </View>
      ) : (
        <Text className="text-base text-gray-500 dark:text-gray-400">
          No analysis yet — run it to see your patterns.
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
            {analysis ? 'Re-run analysis' : 'Run analysis'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
