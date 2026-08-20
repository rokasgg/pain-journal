import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useGeneratePhysioSummary } from '@/hooks/useGeneratePhysioSummary';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function PhysioSummaryModal() {
  const { t } = useTranslation();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { mutateAsync, isPending } = useGeneratePhysioSummary();

  const handleGenerate = async () => {
    const result = await mutateAsync();
    if (result.error) toast.error(result.error);
  };

  const summary = profile?.last_physio_summary ?? null;
  const generatedAt = profile?.last_physio_summary_at ?? null;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-sm text-gray-500 dark:text-gray">{t('physioSummary.description')}</Text>

      {isProfileLoading ? (
        <ActivityIndicator />
      ) : summary ? (
        <View className="gap-2 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
          {generatedAt && (
            <Text className="text-xs uppercase text-gray-500 dark:text-gray">
              {t('physioSummary.generatedOn', { date: formatCheckinDate(generatedAt.slice(0, 10)) })}
            </Text>
          )}
          <Text className="text-base leading-6 text-black dark:text-white">{summary}</Text>
        </View>
      ) : (
        <Text className="text-base text-gray-500 dark:text-gray">{t('physioSummary.noSummaryYet')}</Text>
      )}

      <Pressable
        onPress={handleGenerate}
        disabled={isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">
            {summary ? t('physioSummary.regenerate') : t('physioSummary.generate')}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
